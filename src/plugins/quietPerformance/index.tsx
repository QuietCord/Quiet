/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { Logger } from "@utils/Logger";
import definePlugin, { type PluginNative } from "@utils/types";
import { onceReady } from "@webpack";
import { createRoot, showToast, Toasts } from "@webpack/common";

import { copyBenchmarkToClipboard, captureBenchmarkSnapshotV2 } from "./engine/benchmark";
import {
    clearBenchmarkBaseline,
    compareBenchmarkSnapshots,
    formatComparisonSummary,
    getBenchmarkBaseline,
    saveBenchmarkBaseline,
} from "./engine/baselineRegressionV2";
import { clearProfilerBaseline, copyComparisonToClipboard, saveProfilerBaseline } from "./engine/comparisonMode";
import { markQuietPerfConnectionOpen, markQuietPerfPluginStart, markQuietPerfUiReady } from "./engine/startupProfile";
import { markFluxBatchingConnectionReady } from "./engine/fluxBatching";
import { notePerformanceGuild } from "./engine/stage4/performanceController";
import {
    startAdaptiveEngine,
    stopAdaptiveEngine,
    syncAdaptiveEngine as reloadAdaptiveEngine,
    syncAdaptiveEngineFromController as applyControllerAdaptiveSync,
} from "./engine/index";
import { noteChannelVisit } from "./engine/adaptiveBackground";
import { resolveMessageCacheCap } from "./engine/messageCacheV2";
import { trimInactiveMessageCaches } from "./messageCacheTrim";
import { formatMetricsLine, readMetricsSnapshot } from "./metricsClient";
import { logPatchHealth } from "./patchHealthReport";
import { startProfiler, stopProfiler, getProfilerSnapshot } from "./profiler/collector";
import {
    applyPerformanceClasses,
    clearAllPerformanceClasses,
    settings,
    shouldStripRender,
} from "./settings";
import managedStyle from "./style.css?managed";
import { UsageOverlay } from "./UsageOverlay";
import { ChannelStore, SelectedGuildStore } from "@webpack/common";

const logger = new Logger("QuietPerformance");

function perfPatchesActive() {
    return isPluginEnabled("QuietPerformance");
}

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
        CONNECTION_OPEN() {
            markQuietPerfConnectionOpen();
            markFluxBatchingConnectionReady();
            notePerformanceGuild(SelectedGuildStore.getGuildId());
        },
        CHANNEL_SELECT({ channelId }: { channelId?: string; }) {
            noteChannelVisit(channelId ?? null);
            const ch = channelId ? ChannelStore.getChannel(channelId) : null;
            notePerformanceGuild(ch?.guild_id ?? SelectedGuildStore.getGuildId());
            trimInactiveMessageCaches();
        },
    },

    patches: [
        {
            patchId: "perf-freeze-canAnimate",
            find: "canAnimate:",
            all: true,
            noWarn: true,
            predicate: () => perfPatchesActive() && settings.store.freezeMotion,
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
            predicate: () => perfPatchesActive() && settings.store.freezeMotion,
            replacement: {
                match: /(\.CUSTOM_STATUS.+?animateEmoji:)\i/,
                replace: "$1!1",
            },
        },
        {
            patchId: "perf-freeze-banner",
            find: "#{intl::DISCOVERABLE_GUILD_HEADER_PUBLIC_INFO}",
            predicate: () => perfPatchesActive() && settings.store.freezeMotion,
            replacement: {
                match: /(guildBanner:\i,animate:)\i(?=}\):null)/,
                replace: "$1!1",
            },
        },
        {
            patchId: "perf-freeze-gradient",
            find: "=!1,contentOnly:",
            predicate: () => perfPatchesActive() && settings.store.freezeMotion,
            replacement: {
                match: /animate:\i/,
                replace: "animate:!1",
            },
        },
        {
            patchId: "perf-freeze-nameplate",
            find: ".MINI_PREVIEW,[",
            predicate: () => perfPatchesActive() && settings.store.freezeMotion,
            replacement: {
                match: /animate:\i,loop:/,
                replace: "animate:!1,loop:!1,_loop:",
            },
        },
        {
            patchId: "perf-autoPlayGif",
            find: "autoPlayGif",
            all: true,
            noWarn: true,
            predicate: () => perfPatchesActive() && settings.store.pauseGifAutoplay,
            replacement: {
                // Avoid `autoPlayGif:\i` — it matches destructuring aliases and breaks modules.
                match: /autoPlayGif:!0/g,
                replace: "autoPlayGif:!1",
            },
        },
        {
            patchId: "perf-stripMedia",
            find: "this.renderAttachments(",
            predicate: () =>
                perfPatchesActive() && (
                    settings.store.stripAttachments
                    || settings.store.stripEmbeds
                    || settings.store.stripStickers
                ),
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
            predicate: () => perfPatchesActive() && settings.store.trimMessageCache,
            replacement: {
                match: /this\.truncateTop\((\i)\)/g,
                replace: "this.truncateTop($self.effectiveCacheCapFor(this,$1))",
            },
        },
    ],

    effectiveCacheCapFor(bucket: { channelId?: string; }, limit: number) {
        return resolveMessageCacheCap(limit, bucket);
    },

    effectiveCacheCap(limit: number) {
        return resolveMessageCacheCap(limit);
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
                report.toast,
                report.broken.length ? Toasts.Type.MESSAGE : Toasts.Type.SUCCESS,
            );
        },
        "Export benchmark JSON": async () => {
            await copyBenchmarkToClipboard(SelectedGuildStore.getGuildId());
            showToast("Benchmark snapshot V2 copied to clipboard", Toasts.Type.SUCCESS);
        },
        "Save Stage 4 benchmark baseline": async () => {
            const snap = await captureBenchmarkSnapshotV2("stage4-baseline", SelectedGuildStore.getGuildId());
            await saveBenchmarkBaseline(snap);
            showToast("Stage 4 benchmark baseline saved locally", Toasts.Type.SUCCESS);
        },
        "Compare to Stage 4 baseline": async () => {
            const baseline = await getBenchmarkBaseline();
            if (!baseline) {
                showToast("Save Stage 4 benchmark baseline first", Toasts.Type.MESSAGE);
                return;
            }
            const after = await captureBenchmarkSnapshotV2("compare", SelectedGuildStore.getGuildId());
            const report = compareBenchmarkSnapshots(baseline, after);
            const text = JSON.stringify({ summary: formatComparisonSummary(report), report }, null, 2);
            await navigator.clipboard.writeText(text);
            showToast(report.warnings[0] ?? "Comparison copied to clipboard", Toasts.Type.SUCCESS);
        },
        "Clear Stage 4 baseline": async () => {
            await clearBenchmarkBaseline();
            showToast("Stage 4 benchmark baseline cleared", Toasts.Type.SUCCESS);
        },
        "Save profiler baseline": async () => {
            const snap = await getProfilerSnapshot();
            saveProfilerBaseline("manual", snap);
            showToast("Profiler baseline saved for comparison", Toasts.Type.SUCCESS);
        },
        "Export ON/OFF comparison": async () => {
            const snap = await getProfilerSnapshot();
            await copyComparisonToClipboard(snap, settings.store.channelLayoutCoalesce ? "channelLayoutCoalesce" : "custom");
            showToast("Comparison JSON copied (needs baseline first)", Toasts.Type.MESSAGE);
        },
        "Export self-profile JSON": async () => {
            const { captureQuietSelfProfile } = await import("./engine/stage5/selfProfile");
            await navigator.clipboard.writeText(JSON.stringify(captureQuietSelfProfile(), null, 2));
            showToast("Stage 5 self-profile copied (enable Deep profiler for webpack samples)", Toasts.Type.SUCCESS);
        },
        "Clear profiler baseline": () => {
            clearProfilerBaseline();
            showToast("Profiler baseline cleared", Toasts.Type.SUCCESS);
        },
    },

    syncAdaptiveEngine() {
        reloadAdaptiveEngine();
        void onceReady.then(() => import("./engine/reactComponentProfiler").then(m => m.installReactRenderProfiler()));
    },

    syncAdaptiveEngineFromController() {
        applyControllerAdaptiveSync();
    },

    start() {
        markQuietPerfPluginStart();
        void onceReady.then(() => markQuietPerfUiReady());
        const legacy = settings.store as Record<string, unknown>;
        if (legacy.batchLayoutUpdates && !settings.store.channelLayoutCoalesce) {
            settings.store.channelLayoutCoalesce = !!legacy.batchLayoutUpdates;
        }
        applyPerformanceClasses();
        mountUsageOverlay();
        syncProfiler();
        startAdaptiveEngine();

        if (isPluginEnabled("AlwaysAnimate"))
            logger.warn("AlwaysAnimate is on — disable it for full motion savings.");

        setTimeout(() => logPatchHealth(), 3000);
    },

    syncProfilerOverlay() {
        syncProfiler();
        mountUsageOverlay();
    },

    stop() {
        stopAdaptiveEngine();
        stopProfiler();
        unmountUsageOverlay();
        clearAllPerformanceClasses();
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
