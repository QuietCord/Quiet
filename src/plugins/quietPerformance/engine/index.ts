/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { onceReady } from "@webpack";

import { startAdaptiveBackground, stopAdaptiveBackground, refreshAdaptiveBackground } from "./adaptiveBackground";
import { syncFluxBatching, stopFluxBatching, markFluxBatchingConnectionReady, resetFluxBatchingConnectionReady } from "./fluxBatching";
import { syncLifecycleDebug, stopLifecycleDebug } from "./lifecycleDebug";
import { startMemoryPressureController, stopMemoryPressureController } from "./memoryPressure";
import { syncMediaVisibilityEngine, stopMediaVisibilityEngine } from "./mediaVisibility";
import { installReactHotPathMemos } from "./reactHotPath";

function deferReactHotPath() {
    void onceReady.then(() => installReactHotPathMemos());
}

export function startAdaptiveEngine() {
    startAdaptiveBackground();
    startMemoryPressureController();
    syncFluxBatching();
    syncMediaVisibilityEngine();
    syncLifecycleDebug();
    deferReactHotPath();
}

export function stopAdaptiveEngine() {
    stopAdaptiveBackground();
    stopMemoryPressureController();
    resetFluxBatchingConnectionReady();
    stopFluxBatching();
    stopMediaVisibilityEngine();
    stopLifecycleDebug();
}

export function syncAdaptiveEngine() {
    refreshAdaptiveBackground();
    startMemoryPressureController();
    syncFluxBatching();
    syncMediaVisibilityEngine();
    syncLifecycleDebug();
    deferReactHotPath();
}
