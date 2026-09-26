/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PerformanceProfile } from "./presets";

export type PresetRiskTier = "safe" | "caution" | "risky" | "experimental";

export interface PresetRiskLine {
    tier: PresetRiskTier;
    label: string;
}

export function getPresetRiskLines(profile: PerformanceProfile): PresetRiskLine[] {
    if (profile === "balanced") return [];

    if (profile === "performance") {
        return [
            { tier: "safe", label: "Adaptive background + tiered message cache" },
            { tier: "safe", label: "Pause GIF autoplay + lazy message paint" },
            { tier: "caution", label: "Strip avatar decorations in chat" },
            { tier: "caution", label: "Lower inactive channel message caps" },
            { tier: "caution", label: "Efficient CDN (heavy media blocked in main process)" },
        ];
    }

    if (profile === "minimal") {
        return [
            { tier: "safe", label: "Background motion/GIF throttling" },
            { tier: "caution", label: "Reduced message cache tiers" },
            { tier: "risky", label: "Strip embeds, attachments, stickers in React" },
            { tier: "risky", label: "Text-only CDN policy (restart)" },
            { tier: "risky", label: "Hide member list, reactions, chat avatars" },
            { tier: "experimental", label: "Aggressive V8 memory tuning (restart)" },
        ];
    }

    return [];
}

export function presetNeedsConfirmation(profile: PerformanceProfile) {
    return getPresetRiskLines(profile).some(l => l.tier === "caution" || l.tier === "risky" || l.tier === "experimental");
}
