/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PluginNative } from "@utils/types";

import type { MetricsSnapshot } from "./native";

type Native = PluginNative<typeof import("./native")>;

function native() {
    return VencordNative.pluginHelpers.QuietPerformance as Native;
}

let started = false;

/** Matches main-process sampler interval. */
export const SAMPLER_MS = 5000;

export function ensureMetricsSampler() {
    if (started) return;
    started = true;
    void native().startMetricsSampler();
}

export async function readMetricsSnapshot(force = false): Promise<MetricsSnapshot> {
    ensureMetricsSampler();
    return native().getMetricsSnapshot(force);
}

export function formatMetricsLine(snapshot: MetricsSnapshot) {
    const { ramMb, cpu, processes, buckets } = snapshot;
    const top = [...processes].sort((a, b) => b.ramMb - a.ramMb)[0];
    const ren = buckets.renderer.ramMb;
    return `${ramMb} MB · ${cpu}% CPU · ${processes.length} proc` +
        (ren ? ` · ren ${ren}` : "") +
        (top ? ` · ${top.type} ${top.ramMb}` : "");
}
