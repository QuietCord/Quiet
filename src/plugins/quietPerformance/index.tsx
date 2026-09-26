/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { Logger } from "@utils/Logger";
import definePlugin, { type PluginNative } from "@utils/types";
import { createRoot, showToast, Toasts } from "@webpack/common";

import { trimInactiveMessageCaches } from "./messageCacheTrim";
import { formatMetricsLine, readMetricsSnapshot } from "./metricsClient";
import { logPatchHealth } from "./patchHealthReport";
import { startProfiler, stopProfiler } from "./profiler/collector";
import {
    applyPerformanceClasses,
    settings,
    shouldStripRender,
} from "./settings";
import managedStyle from "./style.css?managed";
import { UsageOverlay } from "./UsageOverlay";

const logger = new Logger("QuietPerformance");

export { settings } from "./settings";

let overlayRoot: ReturnType<typeof createRoot> | null = null;
let overlayHost: HTMLDivElement | null = null;

export default definePlugin({
    name: "QuietPerformance",
    description: "Quiet performance mode: profiles, MessageStore caps, CDN policies, Chromium tuning, metrics sampler, and optional profiler.",
    tags: ["Utility"],
    authors: [{ name: "hyusband", id: 0n }],
    enabledByDefault: true,
    requiresRestart: true,
    settings,
    managedStyle,

    settingsAboutComponent: () => (
        <span>
            React/webpack patches run before DOM (media, GIF autoplay, motion). MessageStore limits use <code>truncateTop</code>.
            CDN policy runs in the main process only for Text Only / Efficient heavy URLs. One shared metrics sampler feeds the pill and profiler.
        </span>
    ),

    flux: {
        CHANNEL_SELECT() {
            trimInactiveMessageCaches();
        },
    },

    patches: [
        {
            patchId: "perf-freeze-canAnimate",
            find: "canAnimate:",
            all: true,
            predicate: () => settings.store.freezeMotion,
            replacement: {
                match: /canAnimate:.+?([,}].*?\))/g,
                replace: (match, rest) => {
                    if (rest.match(/}=.+/)) return match;
                    return `canAnimate:!1${rest}`;
                },
            },
        },
        {
            patchId: "perf-freeze-emoji",
            find: "#{intl::GUILD_OWNER}),children:",
            predicate: () => settings.store.freezeMotion,
            replacement: {
                match: /(\.CUSTOM_STATUS.+?animateEmoji:)\i/,
                replace: "$1!1",
            },
        },
        {
            patchId: "perf-freeze-banner",
            find: "#{intl::DISCOVERABLE_GUILD_HEADER_PUBLIC_INFO}",
            predicate: () => settings.store.freezeMotion,
            replacement: {
                match: /(guildBanner:\i,animate:)\i(?=}\):null)/,
                replace: "$1!1",
            },
        },
        {
            patchId: "perf-freeze-gradient",
            find: "=!1,contentOnly:",
            predicate: () => settings.store.freezeMotion,
            replacement: {
                match: /animate:\i/,
                replace: "animate:!1",
            },
        },
        {
            patchId: "perf-freeze-nameplate",
            find: ".MINI_PREVIEW,[",
            predicate: () => settings.store.freezeMotion,
            replacement: {
                match: /animate:\i,loop:/,
                replace: "animate:!1,loop:!1,_loop:",
            },
        },
        {
            patchId: "perf-autoPlayGif",
            find: "autoPlayGif",
            all: true,
            predicate: () => settings.store.pauseGifAutoplay,
            replacement: {
                match: /autoPlayGif:(\i)/g,
                replace: "autoPlayGif:!1",
            },
        },
        {
            patchId: "perf-stripMedia",
            find: "this.renderAttachments(",
            predicate: () =>
                settings.store.stripAttachments
                || settings.store.stripEmbeds
                || settings.store.stripStickers,
            replacement: {
                match: /(?<=\i=)this\.render(?:Attachments|Embeds|StickersAccessories|ComponentAccessories)\((\i)\)/g,
                replace: (matched, msg) =>
                    `$self.shouldStripRender(${JSON.stringify(matched)},${msg})?null:${matched}`,
            },
        },
        {
            patchId: "perf-truncateTop",
            find: "this.truncateTop",
            all: true,
            predicate: () => settings.store.trimMessageCache,
            replacement: {
                match: /this\.truncateTop\((\i)\)/g,
                replace: "this.truncateTop($self.effectiveCacheCap($1))",
            },
        },
    ],

    effectiveCacheCap(limit: number) {
        if (!settings.store.trimMessageCache) return limit;
        const cap = settings.store.messageCacheCap;
        const n = Number(limit);
        if (Number.isFinite(n)) return Math.min(n, cap);
        return cap;
    },

    shouldStripRender(renderCall: string, message: { id?: string; }) {
        return shouldStripRender(renderCall, message);
    },

    toolboxActions: {
        "Quiet usage": async () => {
            const snap = await readMetricsSnapshot(true);
            logger.info("usage", snap);
            showToast(formatMetricsLine(snap), Toasts.Type.MESSAGE);
        },
        "Clear Quiet cache": async () => {
            const Native = VencordNative.pluginHelpers.QuietPerformance as PluginNative<typeof import("./native")>;
            await Native.clearRendererCache();
            showToast("Renderer HTTP cache cleared", Toasts.Type.SUCCESS);
        },
        "Patch health": () => {
            const report = logPatchHealth();
            showToast(
                `${report.rows.filter(r => r.status === "applied").length}/${report.rows.length} patches OK (Discord ${report.discordBuild})`,
                report.broken.length ? Toasts.Type.MESSAGE : Toasts.Type.SUCCESS,
            );
        },
    },

    start() {
        applyPerformanceClasses();
        mountUsageOverlay();
        syncProfiler();

        if (isPluginEnabled("AlwaysAnimate"))
            logger.warn("AlwaysAnimate is on — disable it for full motion savings.");

        setTimeout(() => logPatchHealth(), 3000);
    },

    syncProfilerOverlay() {
        syncProfiler();
        mountUsageOverlay();
    },

    stop() {
        stopProfiler();
        unmountUsageOverlay();
        document.documentElement.className = document.documentElement.className
            .split(/\s+/)
            .filter(c => !c.startsWith("vc-quiet-perf-"))
            .join(" ");
    },
});

function syncProfiler() {
    if (settings.store.enableProfiler) startProfiler();
    else stopProfiler();
}

function mountUsageOverlay() {
    unmountUsageOverlay();
    if (!settings.store.showUsagePill && !settings.store.enableProfiler) return;

    overlayHost = document.createElement("div");
    overlayHost.id = "vc-quiet-perf-overlay-host";
    document.body.appendChild(overlayHost);
    overlayRoot = createRoot(overlayHost);
    overlayRoot.render(<UsageOverlay />);
}

function unmountUsageOverlay() {
    overlayRoot?.unmount();
    overlayRoot = null;
    overlayHost?.remove();
    overlayHost = null;
}
