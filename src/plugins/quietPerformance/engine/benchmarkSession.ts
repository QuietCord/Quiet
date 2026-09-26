/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

let sessionStart: number | null = null;
let sessionLabel: string | null = null;

export function markBenchmarkSessionStart(label = "benchmark") {
    sessionStart = Date.now();
    sessionLabel = label;
}

export function getBenchmarkSessionDurationSec() {
    if (!sessionStart) return 0;
    return Math.round((Date.now() - sessionStart) / 1000);
}

export function getBenchmarkSessionLabel() {
    return sessionLabel;
}

export function clearBenchmarkSession() {
    sessionStart = null;
    sessionLabel = null;
}
