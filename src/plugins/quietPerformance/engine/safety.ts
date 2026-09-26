/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings, applyPerformanceProfile } from "../settings";
import { clearAutoDisableFlags } from "./optimizationSafety";

const EXPERIMENTAL_KEYS = [
    "memoryPressureController",
    "batchPresenceUpdates",
    "batchTypingUpdates",
    "channelLayoutCoalesce",
    "mediaVisibleOnly",
    "reactMemoHotPath",
    "reactMemoMessage",
    "reactMemoAvatar",
    "lifecycleDebug",
    "aggressiveMemory",
    "disableGpu",
] as const;

export function disableAllExperimentalOptimizations() {
    for (const key of EXPERIMENTAL_KEYS) {
        (settings.store as Record<string, unknown>)[key] = false;
    }
}

export function restoreRecommendedPerformanceSettings() {
    disableAllExperimentalOptimizations();
    clearAutoDisableFlags();
    applyPerformanceProfile("balanced");
}

export function getExperimentalEnabledKeys() {
    return EXPERIMENTAL_KEYS.filter(k => !!(settings.store as Record<string, unknown>)[k]);
}
