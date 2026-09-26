/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isBackgroundMode } from "../adaptiveBackground";
import { settings } from "../../settings";
import { bumpResourceBudget } from "../resourceBudget";
import { getPerformanceControllerState } from "./performanceController";
import type { PerformanceMode } from "./types";

export type SamplingTier = "minimal" | "low" | "normal" | "high" | "benchmark";

export interface SamplingPlan {
    tier: SamplingTier;
    controllerTickMs: number;
    metricsSamplerMs: number;
    memoryPressureTickMs: number;
    profilerPanelMs: number;
    historyEveryControllerTick: number;
    /** 1 = every dispatch, higher = sample 1/N dispatches when tier is low. */
    fluxDispatchSampleRate: number;
}

const PLANS: Record<SamplingTier, Omit<SamplingPlan, "tier">> = {
    minimal: {
        controllerTickMs: 20_000,
        metricsSamplerMs: 15_000,
        memoryPressureTickMs: 60_000,
        profilerPanelMs: 10_000,
        historyEveryControllerTick: 3,
        fluxDispatchSampleRate: 8,
    },
    low: {
        controllerTickMs: 12_000,
        metricsSamplerMs: 8000,
        memoryPressureTickMs: 45_000,
        profilerPanelMs: 8000,
        historyEveryControllerTick: 2,
        fluxDispatchSampleRate: 4,
    },
    normal: {
        controllerTickMs: 8000,
        metricsSamplerMs: 5000,
        memoryPressureTickMs: 30_000,
        profilerPanelMs: 5000,
        historyEveryControllerTick: 1,
        fluxDispatchSampleRate: 1,
    },
    high: {
        controllerTickMs: 4000,
        metricsSamplerMs: 3000,
        memoryPressureTickMs: 20_000,
        profilerPanelMs: 2000,
        historyEveryControllerTick: 1,
        fluxDispatchSampleRate: 1,
    },
    benchmark: {
        controllerTickMs: 3000,
        metricsSamplerMs: 2000,
        memoryPressureTickMs: 15_000,
        profilerPanelMs: 2000,
        historyEveryControllerTick: 1,
        fluxDispatchSampleRate: 1,
    },
};

let activePlan: SamplingPlan = { tier: "normal", ...PLANS.normal };
let controllerTickCounter = 0;
let fluxDispatchCounter = 0;

function modeTier(mode: PerformanceMode | null | undefined): SamplingTier {
    switch (mode) {
        case "idle":
            return "low";
        case "busy":
        case "high_load":
        case "frame_pressure":
        case "memory_pressure":
            return "high";
        case "normal":
        default:
            return "normal";
    }
}

export function resolveSamplingPlan(): SamplingPlan {
    if (settings.store.benchmarkMode) {
        activePlan = { tier: "benchmark", ...PLANS.benchmark };
        return activePlan;
    }

    if (isBackgroundMode()) {
        activePlan = { tier: "minimal", ...PLANS.minimal };
        return activePlan;
    }

    if (settings.store.enableProfiler) {
        activePlan = { tier: "high", ...PLANS.high };
        return activePlan;
    }

    if (settings.store.autoPerformanceController) {
        const mode = getPerformanceControllerState()?.mode;
        const tier = modeTier(mode);
        activePlan = { tier, ...PLANS[tier] };
        return activePlan;
    }

    activePlan = { tier: "normal", ...PLANS.normal };
    return activePlan;
}

export function getActiveSamplingPlan() {
    return activePlan;
}

export function getControllerTickMs() {
    return resolveSamplingPlan().controllerTickMs;
}

export function getMetricsSamplerMs() {
    return resolveSamplingPlan().metricsSamplerMs;
}

export function getMemoryPressureTickMs() {
    return resolveSamplingPlan().memoryPressureTickMs;
}

export function getProfilerPanelMs() {
    return resolveSamplingPlan().profilerPanelMs;
}

export function noteControllerTickComplete() {
    controllerTickCounter++;
    bumpResourceBudget("controllerTicks", 1);
}

export function shouldPushHistoryThisControllerTick() {
    const every = resolveSamplingPlan().historyEveryControllerTick;
    return controllerTickCounter % every === 0;
}

export function shouldRecordFluxDispatch(): boolean {
    const rate = resolveSamplingPlan().fluxDispatchSampleRate;
    fluxDispatchCounter++;
    bumpResourceBudget("fluxDispatchSeen", 1);
    if (rate <= 1) {
        bumpResourceBudget("fluxDispatchRecorded", 1);
        return true;
    }
    if (fluxDispatchCounter % rate === 0) {
        bumpResourceBudget("fluxDispatchRecorded", 1);
        return true;
    }
    return false;
}

export function resetSamplingCounters() {
    controllerTickCounter = 0;
    fluxDispatchCounter = 0;
}
