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
import { installReactRenderProfiler } from "./reactComponentProfiler";
import { collectPluginCostReport, type PluginCostReport } from "./pluginCostProfiler";
import { getResourceBudgetSnapshot } from "./resourceBudget";
import { setBenchmarkMode, setPerformanceSafeMode } from "./stage4/featureControl";
import { startPerformanceController, stopPerformanceController, syncPerformanceController } from "./stage4/performanceController";
import { getInstrumentationDiagnostics, registerDiagnostic } from "./stage5/instrumentationBus";
import { settings } from "../settings";

function deferReactHotPath() {
    void onceReady.then(() => {
        installReactHotPathMemos();
        installReactRenderProfiler();
    });
}

let pluginCostReport: PluginCostReport | null = null;

export function getPluginCostReport() {
    if (!pluginCostReport) pluginCostReport = collectPluginCostReport();
    return pluginCostReport;
}

function syncStage4RuntimeFlags() {
    setPerformanceSafeMode(settings.store.performanceSafeMode);
    setBenchmarkMode(settings.store.benchmarkMode);
}

let diagnosticsRegistered = false;
function ensureQuietDiagnostics() {
    if (diagnosticsRegistered) return;
    diagnosticsRegistered = true;
    registerDiagnostic("instrumentationBus", () => getInstrumentationDiagnostics());
    registerDiagnostic("resourceBudget", () => getResourceBudgetSnapshot());
}

function reloadAdaptiveSubsystems() {
    refreshAdaptiveBackground();
    startMemoryPressureController();
    syncFluxBatching();
    syncMediaVisibilityEngine();
    syncLifecycleDebug();
    deferReactHotPath();
}

export function startAdaptiveEngine() {
    syncStage4RuntimeFlags();
    ensureQuietDiagnostics();
    startPerformanceController();
    startAdaptiveBackground();
    reloadAdaptiveSubsystems();
}

export function stopAdaptiveEngine() {
    stopPerformanceController();
    stopAdaptiveBackground();
    stopMemoryPressureController();
    resetFluxBatchingConnectionReady();
    stopFluxBatching();
    stopMediaVisibilityEngine();
    stopLifecycleDebug();
}

export function syncAdaptiveEngine() {
    syncStage4RuntimeFlags();
    syncPerformanceController();
    reloadAdaptiveSubsystems();
}

/** Apply flux/memory/media patches when auto-tuning flips features (does not restart the controller). */
export function syncAdaptiveEngineFromController() {
    syncStage4RuntimeFlags();
    reloadAdaptiveSubsystems();
}
