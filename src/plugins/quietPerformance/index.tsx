/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { Logger } from "@utils/Logger";
import definePlugin, { type PluginNative } from "@utils/types";
import { createRoot, showToast, Toasts } from "@webpack/common";

import { startDomOptimizer, stopDomOptimizer } from "./domOptimizer";
import { startMessageCacheJanitor, trimInactiveMessageCaches } from "./messageCacheTrim";
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
let cacheJanitorId: ReturnType<typeof setInterval> | null = null;

export default definePlugin({
    name: "QuietPerformance",
    description: "Quiet's performance mode: profiles, optional text-only chat, fewer Chromium processes, and a live RAM/CPU pill.",
    tags: ["Utility"],
    authors: [{ name: "hyusband", id: 0n }],
    enabledByDefault: true,
    requiresRestart: true,
    settings,
    managedStyle,

    settingsAboutComponent: () => (
        <span>
            Quiet runs <strong>inside</strong> Discord: we patch webpack (React), trim <code>MessageStore</code> caches,
            and in the main process we tune Chromium and optionally block CDN media before it is decoded into RAM.
            Vanilla Discord cannot do that without injection.
        </span>
    ),

    flux: {
        CHANNEL_SELECT() {
            trimInactiveMessageCaches();
        },
    },

    patches: [
        {
            find: "canAnimate:",
            all: true,
            noWarn: true,
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
            find: "#{intl::GUILD_OWNER}),children:",
            predicate: () => settings.store.freezeMotion,
            replacement: {
                match: /(\.CUSTOM_STATUS.+?animateEmoji:)\i/,
                replace: "$1!1",
            },
        },
        {
            find: "#{intl::DISCOVERABLE_GUILD_HEADER_PUBLIC_INFO}",
            predicate: () => settings.store.freezeMotion,
            noWarn: true,
            replacement: {
                match: /(guildBanner:\i,animate:)\i(?=}\):null)/,
                replace: "$1!1",
            },
        },
        {
            find: "=!1,contentOnly:",
            predicate: () => settings.store.freezeMotion,
            noWarn: true,
            replacement: {
                match: /animate:\i/,
                replace: "animate:!1",
            },
        },
        {
            find: '="left",className:',
            predicate: () => settings.store.freezeMotion,
            noWarn: true,
            replacement: {
                match: /,animateGradient:/,
                replace: ",animateGradient:!1,_oldAnimateGradient:",
            },
        },
        {
            find: ".MINI_PREVIEW,[",
            predicate: () => settings.store.freezeMotion,
            noWarn: true,
            replacement: {
                match: /animate:\i,loop:/,
                replace: "animate:!1,loop:!1,_loop:",
            },
        },
        {
            find: "autoPlayGif",
            all: true,
            noWarn: true,
            predicate: () => settings.store.pauseGifAutoplay,
            replacement: {
                match: /autoPlayGif:(\i)/g,
                replace: "autoPlayGif:!1",
            },
        },
        {
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
            find: "this.truncateTop",
            all: true,
            noWarn: true,
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
            const Native = VencordNative.pluginHelpers.QuietPerformance as PluginNative<typeof import("./native")>;
            const usage = await Native.getUsage();
            const heaviest = [...usage.processes].sort((a, b) => b.ramMb - a.ramMb)[0];
            logger.info("usage", usage);
            showToast(
                `${usage.ramMb} MB · ${usage.cpu}% CPU · ${usage.processes.length} processes` +
                (heaviest ? ` · top ${heaviest.type} ${heaviest.ramMb} MB` : ""),
                Toasts.Type.MESSAGE,
            );
        },
        "Clear Quiet cache": async () => {
            const Native = VencordNative.pluginHelpers.QuietPerformance as PluginNative<typeof import("./native")>;
            await Native.clearRendererCache();
            showToast("Renderer HTTP cache cleared", Toasts.Type.SUCCESS);
        },
    },

    start() {
        applyPerformanceClasses();
        startDomOptimizer();
        mountUsageOverlay();
        cacheJanitorId = startMessageCacheJanitor();

        if (isPluginEnabled("AlwaysAnimate"))
            logger.warn("AlwaysAnimate is on — disable it for full motion savings.");

        setTimeout(async () => {
            try {
                const Native = VencordNative.pluginHelpers.QuietPerformance as PluginNative<typeof import("./native")>;
                const usage = await Native.getUsage();
                logger.info(`working set ${usage.ramMb} MB, cpu ${usage.cpu}% across ${usage.processes.length} processes`);
            } catch (err) {
                logger.error(err);
            }
        }, 20_000);
    },

    stop() {
        stopDomOptimizer();
        unmountUsageOverlay();
        if (cacheJanitorId != null) clearInterval(cacheJanitorId);
        cacheJanitorId = null;
        document.documentElement.className = document.documentElement.className
            .split(/\s+/)
            .filter(c => !c.startsWith("vc-quiet-perf-"))
            .join(" ");
    },
});

function mountUsageOverlay() {
    unmountUsageOverlay();
    if (!settings.store.showUsagePill) return;

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
