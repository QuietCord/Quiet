/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { readMetricsSnapshot } from "../../metricsClient";
import { getFluxMetricsBundle, ensureFluxMetricsCollection } from "../../profiler/collector";
import { settings } from "../../settings";
import {
    buildActivePolicies,
    framePressureFromP95,
    resolveFeatureEnabled,
    scoreSample,
    shouldTransition,
    softerMode,
} from "./featureControl";
import { getGuildProfile, updateGuildProfile } from "./guildWorkload";
import { pushPerformanceHistory } from "./performanceHistory";
import {
    getControllerTickMs,
    noteControllerTickComplete,
    resolveSamplingPlan,
    shouldPushHistoryThisControllerTick,
} from "./adaptiveSampling";
import { addEstimatedCpuMs, bumpResourceBudget } from "../resourceBudget";
import type { PerformanceControllerState, PerformanceSample } from "./types";

const HYSTERESIS_MS = 12_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let scheduledTickMs = 8000;
let currentMode: PerformanceControllerState["mode"] = "normal";
let pendingMode: PerformanceControllerState["mode"] | null = null;
let pendingSince = 0;
let pendingSamples = 0;
let lastState: PerformanceControllerState | null = null;
let currentGuildId: string | null = null;

const frameTimes: number[] = [];
let frameRaf = 0;
let lastFrame = 0;

function frameLoop(now: number) {
    if (lastFrame) {
        frameTimes.push(now - lastFrame);
        if (frameTimes.length > 120) frameTimes.shift();
    }
    lastFrame = now;
    frameRaf = requestAnimationFrame(frameLoop);
}

function frameP95() {
    if (!frameTimes.length) return 0;
    const sorted = [...frameTimes].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)] ?? 0;
}

function frameP99() {
    if (!frameTimes.length) return 0;
    const sorted = [...frameTimes].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.99)] ?? 0;
}

function fpsEstimate() {
    const avg = frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0;
    return avg > 0 ? Math.round(1000 / avg) : 0;
}

export function notePerformanceGuild(guildId: string | null | undefined) {
    currentGuildId = guildId ?? null;
}

async function collectSample(): Promise<PerformanceSample | null> {
    try {
        const [process, flux] = await Promise.all([
            readMetricsSnapshot(false),
            Promise.resolve(getFluxMetricsBundle()),
        ]);

        return {
            at: Date.now(),
            ramMb: process.ramMb,
            rendererRamMb: process.buckets.renderer.ramMb,
            jsHeapMb: 0,
            fps: fpsEstimate(),
            frameP95Ms: Math.round(frameP95() * 10) / 10,
            frameP99Ms: Math.round(frameP99() * 10) / 10,
            longTasksPerMin: flux.longTasksPerMin,
            fluxPerSec: flux.fluxPerSec,
            messageCreatePerSec: flux.rates.MESSAGE_CREATE ?? 0,
            typingPerSec: (flux.rates.TYPING_START ?? 0) + (flux.rates.TYPING_STOP ?? 0),
            voicePerSec: flux.rates.VOICE_STATE_UPDATES ?? 0,
            layoutDimensionsPerSec: (flux.rates.UPDATE_CHANNEL_LIST_DIMENSIONS ?? 0)
                + (flux.rates.UPDATE_CHANNEL_DIMENSIONS ?? 0),
        };
    } catch {
        return null;
    }
}


let lastEffectiveKey = "";

function effectiveFeaturesKey(state: PerformanceControllerState) {
    return [
        resolveFeatureEnabled("channelLayoutCoalesce", state),
        resolveFeatureEnabled("batchTypingUpdates", state),
        resolveFeatureEnabled("mediaVisibleOnly", state),
        resolveFeatureEnabled("memoryPressureController", state),
    ].join(",");
}

async function tick() {
    if (!settings.store.autoPerformanceController) return;
    const t0 = performance.now();
    resolveSamplingPlan();

    const sample = await collectSample();
    if (!sample) return;

    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; }; }).memory;
    if (mem) sample.jsHeapMb = Math.round(mem.usedJSHeapSize / 1024 / 1024);

    const { elevatedThresholdMb, pressureThresholdMb } = settings.store;
    const scored = scoreSample(sample, elevatedThresholdMb, pressureThresholdMb);
    let candidate = scored.mode;

    if (currentMode === "memory_pressure" && sample.ramMb < pressureThresholdMb - settings.store.hysteresisMb) {
        candidate = softerMode(currentMode, candidate);
    }

    if (pendingMode !== candidate) {
        pendingMode = candidate;
        pendingSince = Date.now();
        pendingSamples = 1;
    } else {
        pendingSamples++;
    }

    if (shouldTransition(currentMode, candidate, pendingSamples) && Date.now() - pendingSince >= HYSTERESIS_MS / 2) {
        currentMode = candidate;
    }

    const guildProfile = await updateGuildProfile(currentGuildId, sample);
    const framePressure = framePressureFromP95(sample.frameP95Ms);

    lastState = {
        mode: currentMode,
        framePressure,
        guildClass: guildProfile?.class ?? (await getGuildProfile(currentGuildId))?.class ?? null,
        sample,
        reasons: scored.reasons,
        activePolicies: [],
        pendingMode: pendingMode === currentMode ? null : pendingMode,
        pendingSamples,
    };
    lastState.activePolicies = buildActivePolicies(lastState);

    if (shouldPushHistoryThisControllerTick()) {
        pushPerformanceHistory({
            t: sample.at,
            ramMb: sample.ramMb,
            heapMb: sample.jsHeapMb,
            p95Ms: sample.frameP95Ms,
            longTasksPerMin: sample.longTasksPerMin,
            mode: currentMode,
            framePressure,
        });
        bumpResourceBudget("historyWrites", 1);
    }

    document.documentElement.dataset.vcQuietPerfMode = currentMode;
    document.documentElement.dataset.vcQuietFramePressure = framePressure;

    const effectiveKey = effectiveFeaturesKey(lastState);
    if (effectiveKey !== lastEffectiveKey) {
        lastEffectiveKey = effectiveKey;
        (Vencord.Plugins.plugins.QuietPerformance as { syncAdaptiveEngineFromController?: () => void; })?.syncAdaptiveEngineFromController?.();
    }

    noteControllerTickComplete();
    addEstimatedCpuMs(performance.now() - t0);
}

function scheduleControllerLoop(immediate = false) {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
    scheduledTickMs = getControllerTickMs();
    const run = () => {
        void tick().finally(() => {
            if (!settings.store.autoPerformanceController) return;
            const nextMs = getControllerTickMs();
            if (nextMs !== scheduledTickMs) scheduledTickMs = nextMs;
            timer = setTimeout(run, scheduledTickMs);
        });
    };
    if (immediate) run();
    else timer = setTimeout(run, scheduledTickMs);
}

export function getPerformanceControllerState() {
    return lastState;
}

export function startPerformanceController() {
    stopPerformanceController();
    if (!settings.store.autoPerformanceController) return;
    ensureFluxMetricsCollection();
    if (!frameRaf) frameRaf = requestAnimationFrame(frameLoop);
    scheduleControllerLoop(true);
}

export function stopPerformanceController() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (frameRaf) cancelAnimationFrame(frameRaf);
    frameRaf = 0;
    frameTimes.length = 0;
    lastFrame = 0;
    currentMode = "normal";
    pendingMode = null;
    lastState = null;
    lastEffectiveKey = "";
    delete document.documentElement.dataset.vcQuietPerfMode;
    delete document.documentElement.dataset.vcQuietFramePressure;
}

export function syncPerformanceController() {
    stopPerformanceController();
    startPerformanceController();
}
