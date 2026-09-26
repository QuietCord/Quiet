/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { getPresetPatch, isApplyingPreset, type PerformanceProfile,withPresetApply } from "./presets";

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

export function applyPerformanceProfile(profile: PerformanceProfile) {
    const patch = getPresetPatch(profile);
    if (!patch) return;
    Object.assign(settings.store, patch, { profile });
    applyPerformanceClasses();
}

export const settings = definePluginSettings({
    profile: {
        type: OptionType.SELECT,
        description: "Balanced keeps chat media. Minimal strips embeds, attachments, stickers, member list, and reactions for the lowest RAM/CPU.",
        options: [
            { label: "Balanced (recommended)", value: "balanced", default: true },
            { label: "Minimum — text-first Discord", value: "minimal" },
            { label: "Custom — you pick toggles below", value: "custom" },
        ],
        onChange(value: PerformanceProfile) {
            if (value === "custom") return;
            withPresetApply(() => applyPerformanceProfile(value));
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
        description: "Max messages kept per inactive channel (active channel unchanged). Lower = less RAM, more re-fetch when you switch back.",
        markers: [20, 35, 50, 75, 100, 150],
        default: 60,
        onChange: markCustomProfile,
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
