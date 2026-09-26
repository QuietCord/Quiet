/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type PerformanceProfile = "balanced" | "minimal" | "custom";

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
    throttleUnfocused: true,
    disableSpellcheck: true,
    aggressiveMemory: false,
    disableGpu: false,
    blockHeavyCdn: false,
    trimMessageCache: true,
    messageCacheCap: 60,
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
    throttleUnfocused: true,
    disableSpellcheck: true,
    aggressiveMemory: true,
    disableGpu: false,
    blockHeavyCdn: true,
    trimMessageCache: true,
    messageCacheCap: 35,
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
