/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PerformanceHistoryPoint } from "./types";

const MAX_POINTS = 360;

const buffer: PerformanceHistoryPoint[] = [];

export function pushPerformanceHistory(point: PerformanceHistoryPoint) {
    buffer.push(point);
    if (buffer.length > MAX_POINTS) buffer.splice(0, buffer.length - MAX_POINTS);
}

export function getPerformanceHistory() {
    return [...buffer];
}

export function clearPerformanceHistory() {
    buffer.length = 0;
}

export function trimPerformanceHistory() {
    if (buffer.length > MAX_POINTS) buffer.splice(0, buffer.length - MAX_POINTS);
}
