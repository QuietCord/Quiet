/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ProfilerSnapshot } from "../profiler/collector";

export interface ComparisonRecord {
    label: string;
    capturedAt: string;
    feature: string;
    snapshot: ProfilerSnapshot;
}

let baseline: ComparisonRecord | null = null;

export function saveProfilerBaseline(feature: string, snapshot: ProfilerSnapshot) {
    baseline = {
        label: "baseline",
        capturedAt: new Date().toISOString(),
        feature,
        snapshot,
    };
    return baseline;
}

export function getProfilerBaseline() {
    return baseline;
}

export function clearProfilerBaseline() {
    baseline = null;
}

function deltaNum(a: number, b: number) {
    return Math.round((b - a) * 10) / 10;
}

export function buildComparison(after: ProfilerSnapshot, feature: string) {
    if (!baseline) return null;
    const b = baseline.snapshot;
    return {
        feature: feature || baseline.feature,
        baselineAt: baseline.capturedAt,
        afterAt: new Date().toISOString(),
        ramMb: { before: b.processMetrics?.ramMb ?? 0, after: after.processMetrics?.ramMb ?? 0, delta: deltaNum(b.processMetrics?.ramMb ?? 0, after.processMetrics?.ramMb ?? 0) },
        rendererRamMb: { before: b.processMetrics?.buckets.renderer.ramMb ?? 0, after: after.processMetrics?.buckets.renderer.ramMb ?? 0 },
        heapMb: { before: b.jsHeapUsedMb, after: after.jsHeapUsedMb, delta: deltaNum(b.jsHeapUsedMb, after.jsHeapUsedMb) },
        fps: { before: b.fps, after: after.fps },
        frameP50Ms: { before: b.frameP50Ms ?? 0, after: after.frameP50Ms ?? 0 },
        frameP95Ms: { before: b.frameP95Ms, after: after.frameP95Ms, delta: deltaNum(b.frameP95Ms, after.frameP95Ms) },
        frameP99Ms: { before: b.frameP99Ms ?? 0, after: after.frameP99Ms ?? 0 },
        longTasksPerMin: { before: b.longTasksPerMin, after: after.longTasksPerMin, delta: deltaNum(b.longTasksPerMin, after.longTasksPerMin) },
        fluxEventsPerSec: { before: b.fluxEventsPerSec, after: after.fluxEventsPerSec },
    };
}

export async function copyComparisonToClipboard(after: ProfilerSnapshot, feature: string) {
    const report = buildComparison(after, feature);
    const text = JSON.stringify(report ?? { error: "No baseline saved. Use toolbox → Save profiler baseline first." }, null, 2);
    await navigator.clipboard.writeText(text);
    return text;
}
