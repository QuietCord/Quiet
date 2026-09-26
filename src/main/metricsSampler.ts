/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";

export type ProcessBucket = "main" | "renderer" | "gpu" | "utility";

export interface ProcessUsage {
    type: string;
    pid: number;
    cpu: number;
    ramMb: number;
    bucket: ProcessBucket;
}

export interface ProcessBucketTotals {
    ramMb: number;
    cpu: number;
    count: number;
}

export interface MetricsSnapshot {
    sampledAt: number;
    ramMb: number;
    cpu: number;
    buckets: Record<ProcessBucket, ProcessBucketTotals>;
    processes: ProcessUsage[];
}

const SAMPLER_MS = 5000;
let samplerTimer: ReturnType<typeof setInterval> | null = null;
let cached: MetricsSnapshot | null = null;

function classifyBucket(type: string): ProcessBucket {
    if (type === "Browser" || type === "Tab") return "renderer";
    if (type === "GPU") return "gpu";
    if (type === "Utility") return "utility";
    return "main";
}

export function sampleMetrics(): MetricsSnapshot {
    const metrics = app.getAppMetrics();
    const now = Date.now();
    const buckets: Record<ProcessBucket, ProcessBucketTotals> = {
        main: { ramMb: 0, cpu: 0, count: 0 },
        renderer: { ramMb: 0, cpu: 0, count: 0 },
        gpu: { ramMb: 0, cpu: 0, count: 0 },
        utility: { ramMb: 0, cpu: 0, count: 0 },
    };

    let ramMb = 0;
    let cpu = 0;
    const processes: ProcessUsage[] = [];

    for (const metric of metrics) {
        const ram = Math.round(metric.memory.workingSetSize / 1024);
        ramMb += ram;

        const cpuPct = Math.round(metric.cpu.percentCPUUsage * 10) / 10;
        cpu += cpuPct;

        const bucket = classifyBucket(metric.type);
        buckets[bucket].ramMb += ram;
        buckets[bucket].cpu += cpuPct;
        buckets[bucket].count++;

        processes.push({
            type: metric.type,
            pid: metric.pid,
            cpu: cpuPct,
            ramMb: ram,
            bucket,
        });
    }

    cpu = Math.round(cpu * 10) / 10;

    cached = {
        sampledAt: now,
        ramMb,
        cpu,
        buckets,
        processes,
    };
    return cached;
}

export function startMetricsSampler() {
    if (samplerTimer) return;
    sampleMetrics();
    samplerTimer = setInterval(sampleMetrics, SAMPLER_MS);
}

export function stopMetricsSampler() {
    if (samplerTimer) clearInterval(samplerTimer);
    samplerTimer = null;
}

export function getMetricsSnapshot(force = false): MetricsSnapshot {
    if (force || !cached || Date.now() - cached.sampledAt > SAMPLER_MS) {
        return sampleMetrics();
    }
    return cached;
}
