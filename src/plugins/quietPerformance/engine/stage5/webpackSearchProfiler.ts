/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { webpackSearchTimingListeners } from "@webpack";

export interface WebpackSearchStat {
    method: string;
    calls: number;
    totalMs: number;
    maxMs: number;
}

const stats = new Map<string, WebpackSearchStat>();
let listening = false;

function onSearch(method: string, durationMs: number) {
    if (durationMs < 0 || durationMs > 60_000) return;
    const prev = stats.get(method) ?? { method, calls: 0, totalMs: 0, maxMs: 0 };
    prev.calls++;
    prev.totalMs += durationMs;
    prev.maxMs = Math.max(prev.maxMs, durationMs);
    stats.set(method, prev);
}

export function startWebpackSearchProfiler() {
    if (listening) return;
    listening = true;
    webpackSearchTimingListeners.add(onSearch);
}

export function stopWebpackSearchProfiler() {
    if (!listening) return;
    listening = false;
    webpackSearchTimingListeners.delete(onSearch);
}

export function getWebpackSearchStats(limit = 8) {
    return [...stats.values()]
        .sort((a, b) => b.totalMs - a.totalMs)
        .slice(0, limit)
        .map(r => ({
            ...r,
            totalMs: Math.round(r.totalMs * 10) / 10,
            maxMs: Math.round(r.maxMs * 10) / 10,
        }));
}

export function clearWebpackSearchStats() {
    stats.clear();
}
