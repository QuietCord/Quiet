/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getActiveSamplingPlan } from "./stage4/adaptiveSampling";

export interface ResourceBudgetSnapshot {
    since: number;
    elapsedSec: number;
    controllerTicks: number;
    fluxDispatchSeen: number;
    fluxDispatchRecorded: number;
    historyWrites: number;
    memoryPressureTicks: number;
    mediaVisibilityCallbacks: number;
    samplerCallbacks: number;
    estimatedCpuMs: number;
    samplingTier: string;
    controllerTickMs: number;
    metricsSamplerMs: number;
}

const counters = {
    controllerTicks: 0,
    fluxDispatchSeen: 0,
    fluxDispatchRecorded: 0,
    historyWrites: 0,
    memoryPressureTicks: 0,
    mediaVisibilityCallbacks: 0,
    samplerCallbacks: 0,
    estimatedCpuMs: 0,
};

const startedAt = Date.now();

export type ResourceBudgetKey = keyof typeof counters;

export function bumpResourceBudget(key: ResourceBudgetKey, amount = 1) {
    counters[key] += amount;
}

export function addEstimatedCpuMs(ms: number) {
    if (ms > 0 && ms < 60_000) counters.estimatedCpuMs += ms;
}

export function getResourceBudgetSnapshot(): ResourceBudgetSnapshot {
    const plan = getActiveSamplingPlan();
    return {
        since: startedAt,
        elapsedSec: Math.round((Date.now() - startedAt) / 1000),
        ...counters,
        estimatedCpuMs: Math.round(counters.estimatedCpuMs * 10) / 10,
        samplingTier: plan.tier,
        controllerTickMs: plan.controllerTickMs,
        metricsSamplerMs: plan.metricsSamplerMs,
    };
}

export function resetResourceBudget() {
    for (const k of Object.keys(counters) as ResourceBudgetKey[]) counters[k] = 0;
}
