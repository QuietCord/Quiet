/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readMetricsSnapshot } from "@plugins/quietPerformance/metricsClient";
import type { MetricsSnapshot } from "@plugins/quietPerformance/native";
import { getLifecycleSnapshot } from "@plugins/quietPerformance/engine/lifecycleDebug";
import { FluxDispatcher } from "@webpack/common";

export interface LongTaskCorrelation {
    durationMs: number;
    fluxLast100ms: Array<{ type: string; count: number; }>;
}

export interface ProfilerSnapshot {
    enabled: boolean;
    fps: number;
    frameP50Ms: number;
    frameP95Ms: number;
    frameP99Ms: number;
    longTasksPerMin: number;
    jsHeapUsedMb: number;
    jsHeapTotalMb: number;
    jsHeapPeakMb: number;
    jsHeapSessionLowMb: number;
    jsHeapDeltaMb: number;
    jsHeapRecoveryPct: number;
    ramMb: number;
    ramPeakMb: number;
    ramSessionLowMb: number;
    ramRecoveryPct: number;
    fluxEventsPerSec: number;
    topFluxEvents: Array<{ type: string; count: number; }>;
    processMetrics: MetricsSnapshot | null;
    lifecycleTimers?: number;
    lifecycleIntervals?: number;
    lastLongTask?: LongTaskCorrelation | null;
}

let enabled = false;
let fluxCounts = new Map<string, number>();
let fluxWindowStart = Date.now();
let fluxRing: Array<{ t: number; type: string; }> = [];
let longTaskCount = 0;
let longTaskWindowStart = Date.now();
let lastLongTask: LongTaskCorrelation | null = null;
const frameTimes: number[] = [];
let rafId = 0;
let lastFrame = 0;
let fluxHookInstalled = false;
let longTaskObserver: PerformanceObserver | null = null;
let dispatchOriginal: typeof FluxDispatcher.dispatch | null = null;

let heapSessionLowMb = Number.MAX_SAFE_INTEGER;
let heapPeakMb = 0;
let ramPeakMb = 0;
let ramSessionLowMb = Number.MAX_SAFE_INTEGER;
let peakRamAt = 0;
let ramAfterPeakSamples: number[] = [];

function percentile(sorted: number[], p: number) {
    if (!sorted.length) return 0;
    return sorted[Math.floor(sorted.length * p)] ?? 0;
}

function tickFluxRate() {
    const now = Date.now();
    if (now - fluxWindowStart >= 10_000) {
        fluxCounts = new Map();
        fluxWindowStart = now;
    }
}

function recordFlux(type: string) {
    const now = Date.now();
    tickFluxRate();
    fluxCounts.set(type, (fluxCounts.get(type) ?? 0) + 1);
    fluxRing.push({ t: now, type });
    const cutoff = now - 200;
    while (fluxRing.length && fluxRing[0].t < cutoff) fluxRing.shift();
}

function fluxWindowCounts(ms: number) {
    const cutoff = Date.now() - ms;
    const counts = new Map<string, number>();
    for (const e of fluxRing) {
        if (e.t < cutoff) continue;
        counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count }));
}

function installFluxHook() {
    if (fluxHookInstalled) return;
    fluxHookInstalled = true;
    dispatchOriginal = FluxDispatcher.dispatch.bind(FluxDispatcher);
    FluxDispatcher.dispatch = function (payload: { type?: string; }) {
        if (enabled && payload?.type) recordFlux(payload.type);
        return dispatchOriginal!(payload);
    };
}

function installLongTaskObserver() {
    if (longTaskObserver || typeof PerformanceObserver === "undefined") return;
    try {
        longTaskObserver = new PerformanceObserver(list => {
            if (!enabled) return;
            for (const entry of list.getEntries()) {
                longTaskCount++;
                lastLongTask = {
                    durationMs: Math.round(entry.duration),
                    fluxLast100ms: fluxWindowCounts(100),
                };
            }
        });
        longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch {
        longTaskObserver = null;
    }
}

function rafLoop(now: number) {
    if (enabled && lastFrame) {
        const dt = now - lastFrame;
        frameTimes.push(dt);
        if (frameTimes.length > 180) frameTimes.shift();
    }
    lastFrame = now;
    rafId = requestAnimationFrame(rafLoop);
}

function updateMemoryStats(jsHeapUsedMb: number, ramMb: number) {
    if (jsHeapUsedMb > 0) {
        heapPeakMb = Math.max(heapPeakMb, jsHeapUsedMb);
        heapSessionLowMb = Math.min(heapSessionLowMb, jsHeapUsedMb);
    }
    if (ramMb > 0) {
        if (ramMb > ramPeakMb) {
            ramPeakMb = ramMb;
            peakRamAt = Date.now();
            ramAfterPeakSamples = [];
        } else if (peakRamAt && Date.now() - peakRamAt < 300_000) {
            ramAfterPeakSamples.push(ramMb);
            if (ramAfterPeakSamples.length > 20) ramAfterPeakSamples.shift();
        }
        ramSessionLowMb = Math.min(ramSessionLowMb, ramMb);
    }
}

function heapRecoveryPct(current: number) {
    if (heapPeakMb <= heapSessionLowMb || heapSessionLowMb === Number.MAX_SAFE_INTEGER) return 100;
    const span = heapPeakMb - heapSessionLowMb;
    if (span <= 0) return 100;
    return Math.round(((heapPeakMb - current) / span) * 100);
}

function ramRecoveryPct(current: number) {
    if (ramPeakMb <= ramSessionLowMb || ramSessionLowMb === Number.MAX_SAFE_INTEGER) return 100;
    const span = ramPeakMb - ramSessionLowMb;
    if (span <= 0) return 100;
    return Math.round(((ramPeakMb - current) / span) * 100);
}

export function startProfiler() {
    if (enabled) return;
    enabled = true;
    installFluxHook();
    installLongTaskObserver();
    if (!rafId) rafId = requestAnimationFrame(rafLoop);
}

export function stopProfiler() {
    enabled = false;
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
    }
}

export async function getProfilerSnapshot(): Promise<ProfilerSnapshot> {
    const empty: ProfilerSnapshot = {
        enabled: false,
        fps: 0,
        frameP50Ms: 0,
        frameP95Ms: 0,
        frameP99Ms: 0,
        longTasksPerMin: 0,
        jsHeapUsedMb: 0,
        jsHeapTotalMb: 0,
        jsHeapPeakMb: 0,
        jsHeapSessionLowMb: 0,
        jsHeapDeltaMb: 0,
        jsHeapRecoveryPct: 100,
        ramMb: 0,
        ramPeakMb: 0,
        ramSessionLowMb: 0,
        ramRecoveryPct: 100,
        fluxEventsPerSec: 0,
        topFluxEvents: [],
        processMetrics: null,
        lastLongTask: null,
    };

    if (!enabled) return empty;

    const sortedFrames = [...frameTimes].sort((a, b) => a - b);
    const p50 = percentile(sortedFrames, 0.5);
    const p95 = percentile(sortedFrames, 0.95);
    const p99 = percentile(sortedFrames, 0.99);
    const avg = sortedFrames.length
        ? sortedFrames.reduce((a, b) => a + b, 0) / sortedFrames.length
        : 0;
    const fps = avg > 0 ? Math.round(1000 / avg) : 0;

    const now = Date.now();
    const fluxElapsed = Math.max(1, (now - fluxWindowStart) / 1000);
    const fluxTotal = [...fluxCounts.values()].reduce((a, b) => a + b, 0);
    const topFluxEvents = [...fluxCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

    const ltElapsedMin = Math.max(1 / 60, (now - longTaskWindowStart) / 60_000);
    const longTasksPerMin = longTaskCount / ltElapsedMin;
    if (now - longTaskWindowStart > 60_000) {
        longTaskCount = 0;
        longTaskWindowStart = now;
    }

    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; }; }).memory;
    const jsHeapUsedMb = mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : 0;
    const jsHeapTotalMb = mem ? Math.round(mem.totalJSHeapSize / 1024 / 1024) : 0;

    let processMetrics: MetricsSnapshot | null = null;
    try {
        processMetrics = await readMetricsSnapshot(false);
    } catch {
        processMetrics = null;
    }

    const ramMb = processMetrics?.ramMb ?? 0;
    updateMemoryStats(jsHeapUsedMb, ramMb);

    const lowHeap = heapSessionLowMb === Number.MAX_SAFE_INTEGER ? jsHeapUsedMb : heapSessionLowMb;
    const lowRam = ramSessionLowMb === Number.MAX_SAFE_INTEGER ? ramMb : ramSessionLowMb;
    const lifecycle = getLifecycleSnapshot();

    return {
        enabled: true,
        fps,
        frameP50Ms: Math.round(p50 * 10) / 10,
        frameP95Ms: Math.round(p95 * 10) / 10,
        frameP99Ms: Math.round(p99 * 10) / 10,
        longTasksPerMin: Math.round(longTasksPerMin * 10) / 10,
        jsHeapUsedMb,
        jsHeapTotalMb,
        jsHeapPeakMb: heapPeakMb,
        jsHeapSessionLowMb: lowHeap,
        jsHeapDeltaMb: jsHeapUsedMb - lowHeap,
        jsHeapRecoveryPct: heapRecoveryPct(jsHeapUsedMb),
        ramMb,
        ramPeakMb,
        ramSessionLowMb: lowRam,
        ramRecoveryPct: ramRecoveryPct(ramMb),
        fluxEventsPerSec: Math.round((fluxTotal / fluxElapsed) * 10) / 10,
        topFluxEvents,
        processMetrics,
        lifecycleTimers: lifecycle.timers,
        lifecycleIntervals: lifecycle.intervals,
        lastLongTask,
    };
}
