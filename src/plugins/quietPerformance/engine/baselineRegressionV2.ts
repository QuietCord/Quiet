/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

import type { BenchmarkSnapshotV2 } from "./benchmarkSnapshotV2";

const BASELINE_KEY = "QuietPerformance_benchmarkBaselineV2";

export async function saveBenchmarkBaseline(snapshot: BenchmarkSnapshotV2) {
    await DataStore.set(BASELINE_KEY, snapshot);
    return snapshot;
}

export async function getBenchmarkBaseline(): Promise<BenchmarkSnapshotV2 | null> {
    return (await DataStore.get(BASELINE_KEY)) ?? null;
}

export async function clearBenchmarkBaseline() {
    await DataStore.del(BASELINE_KEY);
}

export interface MetricDelta {
    before: number;
    after: number;
    delta: number;
    pct?: number;
}

export interface BenchmarkComparisonV2 {
    baselineAt: string;
    afterAt: string;
    baselineGit: string;
    afterGit: string;
    baselineLabel: string;
    afterLabel: string;
    deltas: {
        ramMb: MetricDelta;
        rendererRamMb: MetricDelta;
        heapMb: MetricDelta;
        cpuPct: MetricDelta;
        fps: MetricDelta;
        frameP95Ms: MetricDelta;
        frameP99Ms: MetricDelta;
        longTasksPerMin: MetricDelta;
        fluxPerSec: MetricDelta;
    };
    warnings: string[];
    notes: string[];
}

function delta(before: number, after: number): MetricDelta {
    const d = Math.round((after - before) * 10) / 10;
    const pct = before !== 0 ? Math.round(((after - before) / before) * 1000) / 10 : undefined;
    return { before, after, delta: d, pct };
}

function improvedRam(d: MetricDelta) {
    return d.delta < 0;
}

function improvedLatency(d: MetricDelta) {
    return d.delta < 0;
}

export function compareBenchmarkSnapshots(baseline: BenchmarkSnapshotV2, after: BenchmarkSnapshotV2): BenchmarkComparisonV2 {
    const b = baseline.metrics;
    const a = after.metrics;
    const deltas = {
        ramMb: delta(b.ramMb, a.ramMb),
        rendererRamMb: delta(b.rendererRamMb, a.rendererRamMb),
        heapMb: delta(b.jsHeapUsedMb, a.jsHeapUsedMb),
        cpuPct: delta(b.cpuPct, a.cpuPct),
        fps: delta(b.fps, a.fps),
        frameP95Ms: delta(b.frameP95Ms, a.frameP95Ms),
        frameP99Ms: delta(b.frameP99Ms, a.frameP99Ms),
        longTasksPerMin: delta(b.longTasksPerMin, a.longTasksPerMin),
        fluxPerSec: delta(b.fluxPerSec, a.fluxPerSec),
    };

    const warnings: string[] = [];
    const notes: string[] = [];

    if (improvedRam(deltas.ramMb) && !improvedLatency(deltas.frameP95Ms) && deltas.frameP95Ms.delta > 2) {
        warnings.push("RAM improved but P95 regressed.");
    }
    if (improvedLatency(deltas.frameP95Ms) && deltas.ramMb.delta > 40) {
        warnings.push("P95 improved but RAM increased significantly.");
    }
    if (deltas.cpuPct.delta > 1 && improvedLatency(deltas.frameP95Ms)) {
        warnings.push("Latency improved but CPU increased.");
    }
    if (after.startup.msPluginStartToUiReady != null && baseline.startup.msPluginStartToUiReady != null) {
        const startupDelta = after.startup.msPluginStartToUiReady - baseline.startup.msPluginStartToUiReady;
        if (startupDelta < -200) notes.push(`Startup to UI ready ${startupDelta} ms vs baseline.`);
        if (startupDelta < -200 && deltas.cpuPct.delta > 0.5) {
            warnings.push("Startup improved but CPU increased.");
        }
    }

    if (warnings.length === 0) notes.push("Review each metric — no single score; tradeoffs may still exist.");

    return {
        baselineAt: baseline.capturedAt,
        afterAt: after.capturedAt,
        baselineGit: baseline.quietGitHash,
        afterGit: after.quietGitHash,
        baselineLabel: baseline.label,
        afterLabel: after.label,
        deltas,
        warnings,
        notes,
    };
}

export function formatComparisonSummary(c: BenchmarkComparisonV2): string {
    const lines = [
        `Baseline ${c.baselineGit} → ${c.afterGit}`,
        `RAM ${c.deltas.ramMb.delta >= 0 ? "+" : ""}${c.deltas.ramMb.delta} MB`,
        `Heap ${c.deltas.heapMb.delta >= 0 ? "+" : ""}${c.deltas.heapMb.delta} MB`,
        `P95 ${c.deltas.frameP95Ms.delta >= 0 ? "+" : ""}${c.deltas.frameP95Ms.delta} ms`,
        `Long tasks ${c.deltas.longTasksPerMin.delta >= 0 ? "+" : ""}${c.deltas.longTasksPerMin.delta}/min (${c.deltas.longTasksPerMin.pct ?? 0}%)`,
        `CPU ${c.deltas.cpuPct.delta >= 0 ? "+" : ""}${c.deltas.cpuPct.delta}%`,
    ];
    if (c.warnings.length) lines.push("", "Warnings:", ...c.warnings.map(w => `• ${w}`));
    return lines.join("\n");
}
