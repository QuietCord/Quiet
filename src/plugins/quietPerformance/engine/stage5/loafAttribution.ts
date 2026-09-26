/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { observeFlux } from "./instrumentationBus";

export interface LoafSample {
    durationMs: number;
    blockingMs: number;
    at: number;
    fluxWindow: Array<{ type: string; count: number; }>;
}

const recentFlux: Array<{ t: number; type: string; }> = [];
let observer: PerformanceObserver | null = null;
let stopFlux: (() => void) | null = null;
const samples: LoafSample[] = [];
const MAX_SAMPLES = 20;

function fluxWindowCounts(ms: number) {
    const cutoff = Date.now() - ms;
    const map = new Map<string, number>();
    for (const e of recentFlux) {
        if (e.t < cutoff) continue;
        map.set(e.type, (map.get(e.type) ?? 0) + 1);
    }
    return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));
}

export function startLoafAttribution() {
    if (observer || typeof PerformanceObserver === "undefined") return;

    stopFlux = observeFlux(payload => {
        if (!payload?.type) return;
        const t = Date.now();
        recentFlux.push({ t, type: payload.type });
        const cutoff = t - 500;
        while (recentFlux.length && recentFlux[0].t < cutoff) recentFlux.shift();
    });

    try {
        observer = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                const e = entry as PerformanceEntry & { blockingDuration?: number; };
                samples.push({
                    durationMs: Math.round(entry.duration),
                    blockingMs: Math.round(e.blockingDuration ?? 0),
                    at: Date.now(),
                    fluxWindow: fluxWindowCounts(120),
                });
                if (samples.length > MAX_SAMPLES) samples.shift();
            }
        });
        observer.observe({ type: "long-animation-frame", buffered: true } as PerformanceObserverInit);
    } catch {
        observer = null;
        stopFlux?.();
        stopFlux = null;
    }
}

export function stopLoafAttribution() {
    observer?.disconnect();
    observer = null;
    stopFlux?.();
    stopFlux = null;
}

export function getLoafSamples(limit = 5) {
    return samples.slice(-limit);
}

export function isLoafSupported() {
    return typeof PerformanceObserver !== "undefined";
}
