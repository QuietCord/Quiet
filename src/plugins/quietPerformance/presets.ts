/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expectPatch } from "@shared/quietPatchHealth";

export type PerformanceProfile = "balanced" | "minimal" | "custom";
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
