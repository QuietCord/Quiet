/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readMetricsSnapshot } from "@plugins/quietPerformance/metricsClient";
import type { MetricsSnapshot } from "@plugins/quietPerformance/native";
import { FluxDispatcher } from "@webpack/common";

export interface ProfilerSnapshot {
    enabled: boolean;
    fps: number;
    frameP95Ms: number;
    longTasksPerMin: number;
    jsHeapUsedMb: number;
    jsHeapTotalMb: number;
    fluxEventsPerSec: number;
    topFluxEvents: Array<{ type: string; count: number; }>;
    processMetrics: MetricsSnapshot | null;
}

let enabled = false;
let fluxCounts = new Map<string, number>();
let fluxWindowStart = Date.now();
let longTaskCount = 0;
let longTaskWindowStart = Date.now();
const frameTimes: number[] = [];
let rafId = 0;
let lastFrame = 0;
let fluxHookInstalled = false;
let longTaskObserver: PerformanceObserver | null = null;
let dispatchOriginal: typeof FluxDispatcher.dispatch | null = null;

function tickFluxRate() {
    const now = Date.now();
    if (now - fluxWindowStart >= 10_000) {
        fluxCounts = new Map();
        fluxWindowStart = now;
    }
}

function onFluxEvent(type: string) {
    tickFluxRate();
    fluxCounts.set(type, (fluxCounts.get(type) ?? 0) + 1);
}

function installFluxHook() {
    if (fluxHookInstalled) return;
    fluxHookInstalled = true;
    dispatchOriginal = FluxDispatcher.dispatch.bind(FluxDispatcher);
    FluxDispatcher.dispatch = function (payload: { type?: string; }) {
        if (enabled && payload?.type) onFluxEvent(payload.type);
        return dispatchOriginal!(payload);
    };
}

function installLongTaskObserver() {
    if (longTaskObserver || typeof PerformanceObserver === "undefined") return;
    try {
        longTaskObserver = new PerformanceObserver(list => {
            if (!enabled) return;
            longTaskCount += list.getEntries().length;
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
        if (frameTimes.length > 120) frameTimes.shift();
    }
    lastFrame = now;
    rafId = requestAnimationFrame(rafLoop);
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
    if (!enabled) {
        return {
            enabled: false,
            fps: 0,
            frameP95Ms: 0,
            longTasksPerMin: 0,
            jsHeapUsedMb: 0,
            jsHeapTotalMb: 0,
            fluxEventsPerSec: 0,
            topFluxEvents: [],
            processMetrics: null,
        };
    }

    const sortedFrames = [...frameTimes].sort((a, b) => a - b);
    const p95 = sortedFrames.length
        ? sortedFrames[Math.floor(sortedFrames.length * 0.95)] ?? 0
        : 0;
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

    return {
        enabled: true,
        fps,
        frameP95Ms: Math.round(p95 * 10) / 10,
        longTasksPerMin: Math.round(longTasksPerMin * 10) / 10,
        jsHeapUsedMb,
        jsHeapTotalMb,
        fluxEventsPerSec: Math.round((fluxTotal / fluxElapsed) * 10) / 10,
        topFluxEvents,
        processMetrics,
    };
}
