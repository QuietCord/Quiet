/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

import { readMetricsSnapshot } from "../metricsClient";
import { trimInactiveMessageCaches } from "../messageCacheTrim";
import { settings } from "../settings";
import { syncMediaVisibilityEngine } from "./mediaVisibility";
import {
    canTrimAgain,
    markTrimPerformed,
    setMemoryPressureLevel,
    type PressureLevel,
} from "./memoryPressureState";

const logger = new Logger("QuietPerformance/MemoryPressure");

let timer: ReturnType<typeof setInterval> | null = null;
let current: PressureLevel = "normal";

function thresholds() {
    const { elevatedThresholdMb, pressureThresholdMb, highPressureThresholdMb, hysteresisMb } = settings.store;
    return {
        elevatedThresholdMb,
        pressureThresholdMb,
        highPressureThresholdMb,
        releaseElevated: elevatedThresholdMb - hysteresisMb,
        releasePressure: pressureThresholdMb - hysteresisMb,
        releaseHigh: highPressureThresholdMb - hysteresisMb,
    };
}

function resolveLevel(ramMb: number): PressureLevel {
    const t = thresholds();

    if (current === "high") {
        if (ramMb >= t.highPressureThresholdMb) return "high";
        if (ramMb >= t.pressureThresholdMb) return "pressure";
        if (ramMb >= t.elevatedThresholdMb) return "elevated";
        if (ramMb <= t.releaseHigh) return "normal";
        return "elevated";
    }

    if (current === "pressure") {
        if (ramMb >= t.highPressureThresholdMb) return "high";
        if (ramMb <= t.releasePressure) {
            return ramMb >= t.elevatedThresholdMb ? "elevated" : "normal";
        }
        return "pressure";
    }

    if (current === "elevated") {
        if (ramMb >= t.highPressureThresholdMb) return "high";
        if (ramMb >= t.pressureThresholdMb) return "pressure";
        if (ramMb <= t.releaseElevated) return "normal";
        return "elevated";
    }

    if (ramMb >= t.highPressureThresholdMb) return "high";
    if (ramMb >= t.pressureThresholdMb) return "pressure";
    if (ramMb >= t.elevatedThresholdMb) return "elevated";
    return "normal";
}

function applyTierActions(next: PressureLevel) {
    if (next === "elevated" || next === "pressure" || next === "high") {
        document.documentElement.classList.add("vc-quiet-perf-media-pressure");
    } else {
        document.documentElement.classList.remove("vc-quiet-perf-media-pressure");
    }

    if (next === "elevated" && canTrimAgain(180_000)) {
        syncMediaVisibilityEngine();
        markTrimPerformed();
    }

    if ((next === "pressure" || next === "high") && canTrimAgain(120_000)) {
        const trimmed = trimInactiveMessageCaches();
        if (trimmed > 0) logger.info(`pressure trim removed ${trimmed} messages`);
        markTrimPerformed();
    }

    if (next === "high" && canTrimAgain(90_000)) {
        const trimmed = trimInactiveMessageCaches();
        if (trimmed > 0) logger.info(`high pressure trim removed ${trimmed} messages`);
        markTrimPerformed();
    }
}

async function tick() {
    if (!settings.store.memoryPressureController) {
        if (current !== "normal") {
            current = "normal";
            setMemoryPressureLevel("normal");
            document.documentElement.classList.remove("vc-quiet-perf-media-pressure");
        }
        return;
    }

    try {
        const snap = await readMetricsSnapshot(false);
        const next = resolveLevel(snap.ramMb);
        if (next !== current) {
            logger.info(`RAM ${snap.ramMb} MB → ${next}`);
            current = next;
            setMemoryPressureLevel(next);
        }
        applyTierActions(next);
    } catch (e) {
        logger.error(e);
    }
}

export function startMemoryPressureController() {
    stopMemoryPressureController();
    if (!settings.store.memoryPressureController) return;
    void tick();
    timer = setInterval(tick, 30_000);
}

export function stopMemoryPressureController() {
    if (timer) clearInterval(timer);
    timer = null;
    current = "normal";
    setMemoryPressureLevel("normal");
    document.documentElement.classList.remove("vc-quiet-perf-media-pressure");
}
