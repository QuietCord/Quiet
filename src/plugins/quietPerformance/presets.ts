/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expectPatch } from "@shared/quietPatchHealth";

export type PerformanceProfile = "balanced" | "performance" | "minimal" | "custom";
export type CdnPolicy = "normal" | "efficient" | "textOnly";

export const PRESET_BALANCED = {
    stripEmbeds: false,
    stripAttachments: false,
    stripStickers: false,
    pauseGifAutoplay: true,
    compactChat: false,
    hideMemberList: false,
    hideReactions: false,
    hideChatAvatars: false,
    lazyMessagePaint: true,
    stripDecorations: false,
    liteChromium: true,
    freezeMotion: true,
    disableBlur: true,
    disableSpellcheck: true,
    aggressiveMemory: false,
    disableGpu: false,
    cdnPolicy: "efficient" as CdnPolicy,
    trimMessageCache: true,
    messageCacheCap: 60,
    messageCacheV2: true,
    activeChannelCacheCap: 150,
    recentChannelCacheCap: 75,
    inactiveChannelCacheCap: 60,
    abandonedChannelCacheCap: 25,
    adaptiveBackground: true,
    memoryPressureController: false,
    batchPresenceUpdates: false,
    batchTypingUpdates: false,
    channelLayoutCoalesce: false,
    rasterThreads: "auto",
} as const;

export const PRESET_PERFORMANCE = {
    stripEmbeds: false,
    stripAttachments: false,
    stripStickers: false,
    pauseGifAutoplay: true,
    compactChat: false,
    hideMemberList: false,
    hideReactions: false,
    hideChatAvatars: false,
    lazyMessagePaint: true,
    stripDecorations: true,
    liteChromium: true,
    freezeMotion: true,
    disableBlur: true,
    disableSpellcheck: true,
    aggressiveMemory: false,
    disableGpu: false,
    cdnPolicy: "efficient" as CdnPolicy,
    trimMessageCache: true,
    messageCacheCap: 50,
    messageCacheV2: true,
    activeChannelCacheCap: 120,
    recentChannelCacheCap: 60,
    inactiveChannelCacheCap: 40,
    abandonedChannelCacheCap: 20,
    adaptiveBackground: true,
    memoryPressureController: false,
    batchPresenceUpdates: false,
    batchTypingUpdates: false,
    channelLayoutCoalesce: false,
    rasterThreads: "auto",
} as const;

export const PRESET_MINIMAL = {
    stripEmbeds: true,
    stripAttachments: true,
    stripStickers: true,
    pauseGifAutoplay: true,
    compactChat: true,
    hideMemberList: true,
    hideReactions: true,
    hideChatAvatars: true,
    lazyMessagePaint: true,
    stripDecorations: true,
    liteChromium: true,
    freezeMotion: true,
    disableBlur: true,
    disableSpellcheck: true,
    aggressiveMemory: true,
    disableGpu: false,
    cdnPolicy: "textOnly" as CdnPolicy,
    trimMessageCache: true,
    messageCacheCap: 35,
    messageCacheV2: true,
    activeChannelCacheCap: 80,
    recentChannelCacheCap: 40,
    inactiveChannelCacheCap: 25,
    abandonedChannelCacheCap: 15,
    adaptiveBackground: true,
    memoryPressureController: false,
    batchPresenceUpdates: false,
    batchTypingUpdates: false,
    channelLayoutCoalesce: false,
    rasterThreads: "auto",
} as const;

let applyingPreset = false;

export function isApplyingPreset() {
    return applyingPreset;
}

export function withPresetApply<T>(fn: () => T): T {
    applyingPreset = true;
    try {
        return fn();
    } finally {
        applyingPreset = false;
    }
}

export function getPresetPatch(profile: PerformanceProfile) {
    if (profile === "minimal") return PRESET_MINIMAL;
    if (profile === "performance") return PRESET_PERFORMANCE;
    if (profile === "balanced") return PRESET_BALANCED;
    return null;
}

export const QUIET_PERF_PATCH_IDS = [
    "perf-truncateTop",
    "perf-autoPlayGif",
    "perf-stripMedia",
    "perf-freeze-canAnimate",
    "perf-freeze-emoji",
    "perf-freeze-banner",
    "perf-freeze-gradient",
    "perf-freeze-nameplate",
] as const;

for (const patchId of QUIET_PERF_PATCH_IDS) {
    expectPatch(patchId, "QuietPerformance");
}
