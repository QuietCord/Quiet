/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { moduleFactoryTimingListeners } from "@webpack";
import { classifyWebpackLoadPhase, markQuietPerfWebpackModuleExecuted } from "../startupProfile";

export interface WebpackModuleStat {
    moduleId: string;
    executions: number;
    totalMs: number;
    maxMs: number;
    firstAt: number;
    phase: "pre-connection" | "pre-ui" | "runtime";
}

const stats = new Map<string, WebpackModuleStat>();
let listening = false;

function phaseAt(now: number): WebpackModuleStat["phase"] {
    return classifyWebpackLoadPhase(now);
}

function onFactoryTiming(moduleId: PropertyKey, durationMs: number) {
    if (durationMs <= 0 || durationMs > 30_000) return;
    const id = String(moduleId);
    markQuietPerfWebpackModuleExecuted();
    const now = performance.now();
    const prev = stats.get(id);
    if (!prev) {
        stats.set(id, {
            moduleId: id,
            executions: 1,
            totalMs: durationMs,
            maxMs: durationMs,
            firstAt: now,
            phase: phaseAt(now),
        });
        return;
    }
    prev.executions++;
    prev.totalMs += durationMs;
    prev.maxMs = Math.max(prev.maxMs, durationMs);
}

export function startWebpackModuleProfiler() {
    if (listening) return;
    listening = true;
    moduleFactoryTimingListeners.add(onFactoryTiming);
}

export function stopWebpackModuleProfiler() {
    if (!listening) return;
    listening = false;
    moduleFactoryTimingListeners.delete(onFactoryTiming);
}

export function getWebpackModuleStats(limit = 12) {
    return [...stats.values()]
        .sort((a, b) => b.totalMs - a.totalMs)
        .slice(0, limit)
        .map(r => ({
            ...r,
            totalMs: Math.round(r.totalMs * 10) / 10,
            maxMs: Math.round(r.maxMs * 10) / 10,
            avgMs: Math.round((r.totalMs / r.executions) * 10) / 10,
        }));
}

export function clearWebpackModuleStats() {
    stats.clear();
}
