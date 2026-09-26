/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type PressureLevel = "normal" | "elevated" | "pressure" | "high";

let level: PressureLevel = "normal";
let lastTrimAt = 0;

export function getMemoryPressureLevel() {
    return level;
}

export function setMemoryPressureLevel(next: PressureLevel) {
    level = next;
    const root = document.documentElement;
    root.classList.toggle("vc-quiet-perf-elevated", next === "elevated");
    root.classList.toggle("vc-quiet-perf-pressure", next === "pressure" || next === "high");
    root.classList.toggle("vc-quiet-perf-pressure-high", next === "high");
}

export function shouldAllowLightTrim() {
    return level === "elevated" || level === "pressure" || level === "high";
}

export function shouldAllowAggressiveTrim() {
    return level === "pressure" || level === "high";
}

export function markTrimPerformed() {
    lastTrimAt = Date.now();
}

export function canTrimAgain(minIntervalMs: number) {
    return Date.now() - lastTrimAt >= minIntervalMs;
}
