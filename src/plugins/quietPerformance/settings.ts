/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { presetNeedsConfirmation } from "./presetRisk";
import { PerformanceAutoPanel } from "./PerformanceAutoPanel";
import { PerformanceDeepPanel } from "./PerformanceDeepPanel";
import { PerformanceHistoryPanel } from "./PerformanceHistoryPanel";
import { PerformanceSettingsExtras } from "./PerformanceSettingsExtras";

import { getPresetPatch, isApplyingPreset, type PerformanceProfile, withPresetApply } from "./presets";

const FEATURE_MODE_OPTIONS = [
    { label: "Auto — Quiet decides when busy", value: "auto", default: true },
    { label: "On — always enable", value: "on" },
    { label: "Off — never enable", value: "off" },
] as const;

const CLASS = {
    motion: "vc-quiet-perf-motion",
    blur: "vc-quiet-perf-blur",
    noEmbeds: "vc-quiet-perf-no-embeds",
    noAttachments: "vc-quiet-perf-no-attachments",
    noStickers: "vc-quiet-perf-no-stickers",
    noGif: "vc-quiet-perf-no-gif",
    compact: "vc-quiet-perf-compact",
    noMemberList: "vc-quiet-perf-no-memberlist",
    noReactions: "vc-quiet-perf-no-reactions",
    noChatAvatars: "vc-quiet-perf-no-chat-avatars",
    lazyPaint: "vc-quiet-perf-lazy-messages",
    noDecor: "vc-quiet-perf-no-decor",
    noEffects: "vc-quiet-perf-no-effects",
} as const;

function setRootClass(className: string, on: boolean) {
    document.documentElement.classList.toggle(className, on);
}

function markCustomProfile() {
    if (!isApplyingPreset() && settings.store.profile !== "custom")
        settings.store.profile = "custom";
}

function onContentToggle() {
    markCustomProfile();
    applyPerformanceClasses();
}

function onAdaptiveEngineChange() {
    markCustomProfile();
    (Vencord.Plugins.plugins.QuietPerformance as { syncAdaptiveEngine?: () => void; })?.syncAdaptiveEngine?.();
}

function onStage4Change() {
    markCustomProfile();
    (Vencord.Plugins.plugins.QuietPerformance as { syncAdaptiveEngine?: () => void; })?.syncAdaptiveEngine?.();
}

export function applyPerformanceProfile(profile: PerformanceProfile) {
    const patch = getPresetPatch(profile);
    if (!patch) return;
    Object.assign(settings.store, patch, { profile });
    applyPerformanceClasses();
    (Vencord.Plugins.plugins.QuietPerformance as { syncAdaptiveEngine?: () => void; })?.syncAdaptiveEngine?.();
}

export const settings = definePluginSettings({
    profile: {
        type: OptionType.SELECT,
        description: "Balanced keeps chat media. Minimal strips embeds, attachments, stickers, member list, and reactions for the lowest RAM/CPU.",
        options: [
            { label: "Balanced (recommended)", value: "balanced", default: true },
            { label: "Performance — fewer visuals, tiered cache", value: "performance" },
            { label: "Minimum — text-first Discord", value: "minimal" },
            { label: "Custom — you pick toggles below", value: "custom" },
        ],
        onChange(value: PerformanceProfile) {
            if (value === "custom") return;
            const previous = settings.store.profile;
            if (!presetNeedsConfirmation(value)) {
                withPresetApply(() => applyPerformanceProfile(value));
                return;
            }
            settings.store.profile = previous;
            void import("./openPresetConfirm").then(({ openPresetConfirmModal }) => openPresetConfirmModal(value));
        },
    },
    showUsagePill: {
        type: OptionType.BOOLEAN,
        description: "Show a small RAM/CPU pill in the corner (same numbers as toolbox → Quiet usage).",
        default: true,
    },
    stripEmbeds: {
        type: OptionType.BOOLEAN,
        description: "Do not render link embeds in chat (saves layout + network decode). Text stays.",
        default: false,
        onChange: onContentToggle,
    },
    stripAttachments: {
        type: OptionType.BOOLEAN,
        description: "Do not render image/video/file attachments. Text stays.",
        default: false,
        onChange: onContentToggle,
    },
    stripStickers: {
        type: OptionType.BOOLEAN,
        description: "Do not render sticker accessories on messages.",
        default: false,
        onChange: onContentToggle,
    },
    pauseGifAutoplay: {
        type: OptionType.BOOLEAN,
        description: "Do not autoplay GIFs in chat and pause inline videos until you click.",
        default: true,
        onChange: onContentToggle,
    },
    compactChat: {
        type: OptionType.BOOLEAN,
        description: "Tighter message spacing and smaller inline emoji.",
        default: false,
        onChange: onContentToggle,
    },
    hideMemberList: {
        type: OptionType.BOOLEAN,
        description: "Hide the right-hand member list in servers (big win in large guilds).",
        default: false,
        onChange: onContentToggle,
    },
    hideReactions: {
        type: OptionType.BOOLEAN,
        description: "Hide reaction rows under messages.",
        default: false,
        onChange: onContentToggle,
    },
    hideChatAvatars: {
        type: OptionType.BOOLEAN,
        description: "Hide message avatars in the chat column (keeps names).",
        default: false,
        onChange: onContentToggle,
    },
    lazyMessagePaint: {
        type: OptionType.BOOLEAN,
        description: "content-visibility on messages (paint skipping off-screen).",
        default: true,
        onChange: onContentToggle,
    },
    stripDecorations: {
        type: OptionType.BOOLEAN,
        description: "Hide avatar decorations and profile effect previews in chat.",
        default: false,
        onChange: onContentToggle,
    },
    trimMessageCache: {
        type: OptionType.BOOLEAN,
        description: "Lower MessageStore caps via truncateTop patch. Inactive channels get a one-shot fallback trim on channel switch only.",
        default: true,
        onChange: markCustomProfile,
    },
    messageCacheCap: {
        type: OptionType.SLIDER,
        description: "Legacy single cap when tiered cache is off. With tiered cache, inactive channels use the inactive slider below.",
        markers: [20, 35, 50, 75, 100, 150],
        default: 60,
        onChange: markCustomProfile,
    },
    messageCacheV2: {
        type: OptionType.BOOLEAN,
        description: "Caution — Tiered LRU caps: active channel high, recently visited medium, abandoned low. May re-fetch when returning to old channels.",
        default: true,
        onChange: onAdaptiveEngineChange,
    },
    activeChannelCacheCap: {
        type: OptionType.SLIDER,
        description: "Max messages kept for the channel you are viewing.",
        markers: [80, 120, 150, 200, 250],
        default: 150,
        onChange: markCustomProfile,
    },
    recentChannelCacheCap: {
        type: OptionType.SLIDER,
        description: "Cap for the last few channels you visited (not the active one).",
        markers: [40, 60, 75, 100, 120],
        default: 75,
        onChange: markCustomProfile,
    },
    inactiveChannelCacheCap: {
        type: OptionType.SLIDER,
        description: "Cap for channels you have not opened recently.",
        markers: [20, 35, 50, 60, 80],
        default: 60,
        onChange: markCustomProfile,
    },
    abandonedChannelCacheCap: {
        type: OptionType.SLIDER,
        description: "Caution — Minimum cap for channels not visited in ~20 minutes (LRU tail).",
        markers: [15, 25, 35, 50],
        default: 25,
        onChange: markCustomProfile,
    },
    adaptiveBackground: {
        type: OptionType.BOOLEAN,
        description: "Safe — When Discord loses focus or is hidden, pause motion/GIF autoplay via CSS. Does not affect voice or messages.",
        default: true,
        onChange: onAdaptiveEngineChange,
    },
    memoryPressureController: {
        type: OptionType.BOOLEAN,
        description: "Experimental / Caution — Adaptive RAM tiers (elevated → pressure → high) with hysteresis. Incremental cache/media cleanup only.",
        default: false,
        onChange: onAdaptiveEngineChange,
    },
    elevatedThresholdMb: {
        type: OptionType.SLIDER,
        description: "Enter elevated tier when total RAM exceeds this (MB).",
        markers: [750, 850, 900, 950],
        default: 850,
        onChange: markCustomProfile,
    },
    pressureThresholdMb: {
        type: OptionType.SLIDER,
        description: "Enter pressure tier when total RAM exceeds this (MB).",
        markers: [850, 950, 1000, 1050],
        default: 950,
        onChange: markCustomProfile,
    },
    highPressureThresholdMb: {
        type: OptionType.SLIDER,
        description: "Enter high tier when total RAM exceeds this (MB).",
        markers: [1000, 1100, 1200, 1300],
        default: 1100,
        onChange: markCustomProfile,
    },
    hysteresisMb: {
        type: OptionType.SLIDER,
        description: "MB below a threshold before leaving that pressure tier (avoids flip-flopping).",
        markers: [40, 60, 80, 100, 120],
        default: 80,
        onChange: markCustomProfile,
    },
    batchPresenceUpdates: {
        type: OptionType.BOOLEAN,
        description: "Experimental — Reserved (presence batching disabled; it breaks PRESENCE_UPDATES). Use layout coalesce instead.",
        default: false,
        hidden: true,
        onChange: onAdaptiveEngineChange,
    },
    batchTypingUpdates: {
        type: OptionType.BOOLEAN,
        description: "Experimental / Caution — Typing visual batch (one rAF frame). Typing dots may lag ~1 frame. Does not change network state.",
        default: false,
        onChange: onAdaptiveEngineChange,
    },
    channelLayoutCoalesce: {
        type: OptionType.BOOLEAN,
        description: "Experimental / Caution — Coalesce UPDATE_CHANNEL_LIST_DIMENSIONS & UPDATE_CHANNEL_DIMENSIONS per frame (last state wins). May delay sidebar layout slightly.",
        default: false,
        onChange: onAdaptiveEngineChange,
    },
    mediaVisibleOnly: {
        type: OptionType.BOOLEAN,
        description: "Experimental — Pause off-screen videos and defer GIF paint until near viewport.",
        default: false,
        onChange: onAdaptiveEngineChange,
    },
    reactMemoHotPath: {
        type: OptionType.BOOLEAN,
        description: "Experimental — Enable React.memo wrappers on hot-path components (requires sub-toggles).",
        default: false,
        onChange: onAdaptiveEngineChange,
    },
    reactMemoMessage: {
        type: OptionType.BOOLEAN,
        description: "Experimental — Memo Message when content/id/timestamps unchanged.",
        default: false,
        onChange: onAdaptiveEngineChange,
    },
    reactMemoAvatar: {
        type: OptionType.BOOLEAN,
        description: "Experimental — Memo Avatar when user/size/decoration unchanged.",
        default: false,
        onChange: onAdaptiveEngineChange,
    },
    lifecycleDebug: {
        type: OptionType.BOOLEAN,
        description: "Experimental — Track active setTimeout/setInterval counts (shown in profiler when enabled).",
        default: false,
        onChange: onAdaptiveEngineChange,
    },
    autoDisableExperimental: {
        type: OptionType.BOOLEAN,
        description: "Auto-disable experimental optimizations after repeated runtime errors (Patch Health / safety layer).",
        default: true,
    },
    autoPerformanceController: {
        type: OptionType.BOOLEAN,
        description: "Stage 4 — Rolling metrics (8s) choose BUSY/HIGH LOAD/MEMORY PRESSURE and enable experimental features only when needed. Visible in Stage 4 panel below.",
        default: false,
        onChange: onStage4Change,
    },
    performanceSafeMode: {
        type: OptionType.BOOLEAN,
        description: "Safe mode — force all auto/experimental adaptive patches OFF (basic Quiet + profiles). Use after Discord updates.",
        default: false,
        onChange: onStage4Change,
    },
    benchmarkMode: {
        type: OptionType.BOOLEAN,
        description: "Benchmark — faster controller ticks (3s), auto-tuning uses manual legacy toggles only (no AUTO decisions). For comparable exports.",
        default: false,
        onChange(value: boolean) {
            onStage4Change();
            void import("./engine/benchmarkSession").then(({ markBenchmarkSessionStart, clearBenchmarkSession }) => {
                if (value) markBenchmarkSessionStart("benchmark");
                else clearBenchmarkSession();
            });
        },
    },
    channelLayoutCoalesceMode: {
        type: OptionType.SELECT,
        description: "Channel layout coalesce — AUTO/ON/OFF (overrides the boolean above when set).",
        options: [...FEATURE_MODE_OPTIONS],
        default: "auto",
        onChange: onStage4Change,
    },
    batchTypingUpdatesMode: {
        type: OptionType.SELECT,
        description: "Typing visual batch — AUTO/ON/OFF.",
        options: [...FEATURE_MODE_OPTIONS],
        default: "auto",
        onChange: onStage4Change,
    },
    memoryPressureControllerMode: {
        type: OptionType.SELECT,
        description: "Memory pressure tiers — AUTO/ON/OFF.",
        options: [...FEATURE_MODE_OPTIONS],
        default: "auto",
        onChange: onStage4Change,
    },
    mediaVisibleOnlyMode: {
        type: OptionType.SELECT,
        description: "Off-screen media throttle — AUTO/ON/OFF.",
        options: [...FEATURE_MODE_OPTIONS],
        default: "auto",
        onChange: onStage4Change,
    },
    stage4Panel: {
        type: OptionType.COMPONENT,
        component: PerformanceAutoPanel,
    },
    performanceHistoryPanel: {
        type: OptionType.COMPONENT,
        component: PerformanceHistoryPanel,
    },
    reactRenderProfiler: {
        type: OptionType.BOOLEAN,
        description: "Experimental — Count renders for hot Discord components (Message, Avatar, ChannelRow, MemberListItem). Profiler-style overhead when enabled.",
        default: false,
        onChange: onAdaptiveEngineChange,
    },
    deepProfiler: {
        type: OptionType.BOOLEAN,
        description: "Stage 5 — Deep attribution: webpack module/search timing, Flux fanout hints, LoAF correlation. Noticeable overhead; disable for daily use.",
        default: false,
        onChange: onAdaptiveEngineChange,
    },
    stage5Panel: {
        type: OptionType.COMPONENT,
        component: PerformanceDeepPanel,
    },
    stage3Panel: {
        type: OptionType.COMPONENT,
        component: PerformanceSettingsExtras,
    },
    cdnPolicy: {
        type: OptionType.SELECT,
        description: "Normal: no CDN blocks. Efficient: block attachments, GIFs, heavy decorations (keeps avatars/icons/emojis). Text Only: block all CDN images/media. Restart required.",
        default: "efficient",
        restartNeeded: true,
        options: [
            { label: "Normal", value: "normal" },
            { label: "Efficient (recommended)", value: "efficient", default: true },
            { label: "Text only", value: "textOnly" },
        ],
        onChange: markCustomProfile,
    },
    rasterThreads: {
        type: OptionType.SELECT,
        description: "Chromium raster threads (lite Chromium). Auto leaves Discord defaults. Restart required.",
        default: "auto",
        restartNeeded: true,
        options: [
            { label: "Auto", value: "auto", default: true },
            { label: "1", value: "1" },
            { label: "2", value: "2" },
            { label: "4", value: "4" },
        ],
        onChange: markCustomProfile,
    },
    enableProfiler: {
        type: OptionType.BOOLEAN,
        description: "Show the Quiet Profiler panel (FPS, long tasks, Flux rate, heap). Off = zero overhead.",
        default: false,
        onChange() {
            (Vencord.Plugins.plugins.QuietPerformance as { syncProfilerOverlay?: () => void; })?.syncProfilerOverlay?.();
        },
    },
    patchDiagnostics: {
        type: OptionType.BOOLEAN,
        description: "Log QuietPerformance patch health when Discord updates break webpack finds.",
        default: true,
    },
    liteChromium: {
        type: OptionType.BOOLEAN,
        description: "Fewer Chromium helper processes, no spare renderer, EcoQoS on Windows. Restart required.",
        default: true,
        restartNeeded: true,
    },
    aggressiveMemory: {
        type: OptionType.BOOLEAN,
        description: "Extra V8 memory tuning (smaller heap growth). Restart required.",
        default: false,
        restartNeeded: true,
    },
    disableGpu: {
        type: OptionType.BOOLEAN,
        description: "Software rendering only — can drop GPU process RAM but hurts scroll FPS. Restart required.",
        default: false,
        restartNeeded: true,
    },
    freezeMotion: {
        type: OptionType.BOOLEAN,
        description: "Static avatars, emoji, banners, nameplates; kill CSS animation loops.",
        default: true,
        restartNeeded: true,
        onChange(value: boolean) {
            markCustomProfile();
            setRootClass(CLASS.motion, value);
        },
    },
    disableBlur: {
        type: OptionType.BOOLEAN,
        description: "Remove backdrop-filter blur (modals, layers).",
        default: true,
        onChange(value: boolean) {
            markCustomProfile();
            setRootClass(CLASS.blur, value);
        },
    },
    disableSpellcheck: {
        type: OptionType.BOOLEAN,
        description: "Skip spellcheck dictionaries (tens of MB). Restart required.",
        default: true,
        restartNeeded: true,
    },
});

export type QuietPerformanceSettings = typeof settings.store;

export function applyPerformanceClasses() {
    const s = settings.store;
    setRootClass(CLASS.motion, s.freezeMotion);
    setRootClass(CLASS.blur, s.disableBlur);
    setRootClass(CLASS.noEmbeds, s.stripEmbeds);
    setRootClass(CLASS.noAttachments, s.stripAttachments);
    setRootClass(CLASS.noStickers, s.stripStickers);
    setRootClass(CLASS.noGif, s.pauseGifAutoplay);
    setRootClass(CLASS.compact, s.compactChat);
    setRootClass(CLASS.noMemberList, s.hideMemberList);
    setRootClass(CLASS.noReactions, s.hideReactions);
    setRootClass(CLASS.noChatAvatars, s.hideChatAvatars);
    setRootClass(CLASS.lazyPaint, s.lazyMessagePaint);
    setRootClass(CLASS.noDecor, s.stripDecorations);
    setRootClass(CLASS.noEffects, s.compactChat || s.stripEmbeds);
}

export function shouldStripRender(renderCall: string, message: { id?: string; } | null | undefined) {
    if (!message?.id) return false;
    if (renderCall.includes("renderAttachments") && settings.store.stripAttachments) return true;
    if (renderCall.includes("renderEmbeds") && settings.store.stripEmbeds) return true;
    if (renderCall.includes("Stickers") && settings.store.stripStickers) return true;
    return false;
}
