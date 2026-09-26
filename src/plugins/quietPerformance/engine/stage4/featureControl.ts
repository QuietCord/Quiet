/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "../../settings";
import type { AutoFeatureKey, FramePressureTier, PerformanceControllerState, PerformanceMode, PerformanceSample } from "./types";

let safeMode = false;
let benchmarkMode = false;

export function setPerformanceSafeMode(on: boolean) {
    safeMode = on;
}

export function isPerformanceSafeMode() {
    return safeMode || settings.store.performanceSafeMode;
}

export function setBenchmarkMode(on: boolean) {
    benchmarkMode = on;
}

export function isBenchmarkMode() {
    return benchmarkMode || settings.store.benchmarkMode;
}

function triStateFor(feature: AutoFeatureKey): "auto" | "on" | "off" {
    const modeKey = `${feature}Mode` as keyof typeof settings.store;
    const legacy = settings.store[feature as keyof typeof settings.store];
    const mode = settings.store[modeKey] as "auto" | "on" | "off" | undefined;
    if (mode === "auto" || mode === "on" || mode === "off") return mode;
    if (legacy === true) return "on";
    if (legacy === false) return "off";
    return "auto";
}

export function getFeatureTriState(feature: AutoFeatureKey) {
    return triStateFor(feature);
}

export function resolveFeatureEnabled(feature: AutoFeatureKey, state: PerformanceControllerState | null): boolean {
    if (isPerformanceSafeMode()) return false;
    const tri = triStateFor(feature);
    if (tri === "on") return true;
    if (tri === "off") return false;
    if (isBenchmarkMode() || !settings.store.autoPerformanceController) {
        return !!(settings.store[feature as keyof typeof settings.store] as boolean);
    }
    if (!state) return false;
    return shouldAutoEnable(feature, state);
}

function shouldAutoEnable(feature: AutoFeatureKey, state: PerformanceControllerState): boolean {
    const { mode, framePressure, guildClass } = state;

    switch (feature) {
        case "channelLayoutCoalesce":
            if (mode === "high_load" || mode === "frame_pressure" || mode === "busy") return true;
            if (framePressure === "moderate" || framePressure === "severe") return true;
            if (guildClass === "heavy" || guildClass === "extreme") return true;
            return false;
        case "batchTypingUpdates":
            return mode === "busy" || mode === "high_load" || framePressure !== "none";
        case "mediaVisibleOnly":
            return mode === "memory_pressure" || mode === "high_load" || framePressure !== "none";
        case "memoryPressureController":
            return mode === "memory_pressure";
        default:
            return false;
    }
}

export function buildActivePolicies(state: PerformanceControllerState): string[] {
    const policies: string[] = [];
    if (resolveFeatureEnabled("channelLayoutCoalesce", state)) policies.push("Channel layout coalesce");
    if (resolveFeatureEnabled("batchTypingUpdates", state)) policies.push("Typing visual batch");
    if (resolveFeatureEnabled("mediaVisibleOnly", state)) policies.push("Off-screen media throttle");
    if (resolveFeatureEnabled("memoryPressureController", state)) policies.push("Adaptive memory cleanup");
    if (state.framePressure !== "none") policies.push(`Frame pressure (${state.framePressure})`);
    return policies;
}

export function framePressureFromP95(p95: number): FramePressureTier {
    if (p95 >= 50) return "severe";
    if (p95 >= 30) return "moderate";
    if (p95 >= 18) return "light";
    return "none";
}

export function scoreSample(sample: PerformanceSample, elevatedMb: number, pressureMb: number) {
    const reasons: string[] = [];
    const candidates: PerformanceMode[] = ["normal"];

    if (sample.fluxPerSec < 5 && sample.frameP95Ms < 15 && sample.longTasksPerMin < 8) {
        candidates.push("idle");
        reasons.push(`Flux ${sample.fluxPerSec}/s`, `P95 ${sample.frameP95Ms} ms`);
    }

    if (sample.messageCreatePerSec >= 3 || sample.layoutDimensionsPerSec >= 8 || sample.fluxPerSec >= 18) {
        candidates.push("busy");
        reasons.push(`Messages ${sample.messageCreatePerSec}/s`, `Layout ${sample.layoutDimensionsPerSec}/s`);
    }

    if (sample.frameP95Ms >= 30 || sample.longTasksPerMin >= 28) {
        candidates.push("high_load");
        reasons.push(`P95 ${sample.frameP95Ms} ms`, `Long tasks ${sample.longTasksPerMin}/min`);
    }

    if (sample.frameP95Ms >= 18) {
        candidates.push("frame_pressure");
        reasons.push(`Frame P95 ${sample.frameP95Ms} ms`);
    }

    if (sample.ramMb >= pressureMb) {
        candidates.push("memory_pressure");
        reasons.push(`RAM ${sample.ramMb} MB`);
    } else if (sample.ramMb >= elevatedMb) {
        reasons.push(`RAM elevated ${sample.ramMb} MB`);
    }

    let mode: PerformanceMode = "normal";
    for (const c of candidates) {
        if (MODE_RANK[c] > MODE_RANK[mode]) mode = c;
    }
    if (reasons.length === 0) reasons.push("Typical activity");

    return { mode, reasons };
}

const MODE_RANK: Record<PerformanceMode, number> = {
    idle: 0,
    normal: 1,
    busy: 2,
    frame_pressure: 3,
    high_load: 4,
    memory_pressure: 5,
};

export function shouldTransition(current: PerformanceMode, candidate: PerformanceMode, holdCount: number) {
    if (current === candidate) return true;
    const rankDiff = MODE_RANK[candidate] - MODE_RANK[current];
    if (Math.abs(rankDiff) >= 2) return holdCount >= 1;
    return holdCount >= 2;
}

export function softerMode(current: PerformanceMode, candidate: PerformanceMode) {
    return MODE_RANK[candidate] < MODE_RANK[current] ? candidate : current;
}
