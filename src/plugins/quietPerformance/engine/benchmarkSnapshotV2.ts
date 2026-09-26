/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getBuildNumber } from "@webpack/patcher";
import gitHash from "~git-hash";

import { readMetricsSnapshot } from "../metricsClient";
import { getProfilerSnapshot } from "../profiler/collector";
import { settings } from "../settings";
import { anonymizeGuildId, getHardwareContext } from "./benchmarkContext";
import { getBenchmarkSessionDurationSec, getBenchmarkSessionLabel } from "./benchmarkSession";
import { getLifecycleSnapshot } from "./lifecycleDebug";
import { getMemoryPressureLevel } from "./memoryPressureState";
import { getResourceBudgetSnapshot } from "./resourceBudget";
import { getStartupProfile } from "./startupProfile";
import { getFeatureTriState, isBenchmarkMode, isPerformanceSafeMode } from "./stage4/featureControl";
import { getGuildProfile } from "./stage4/guildWorkload";
import { getPerformanceControllerState } from "./stage4/performanceController";
import { resolveFeatureEnabled } from "./stage4/featureControl";
import { getActiveSamplingPlan } from "./stage4/adaptiveSampling";
import { captureQuietSelfProfile } from "./stage5/selfProfile";
import type { AutoFeatureKey } from "./stage4/types";

const AUTO_FEATURES: AutoFeatureKey[] = [
    "channelLayoutCoalesce",
    "batchTypingUpdates",
    "mediaVisibleOnly",
    "memoryPressureController",
];

export interface BenchmarkSnapshotV2 {
    schema: 2;
    label: string;
    capturedAt: string;
    durationSec: number;
    discordBuild: number;
    quietGitHash: string;
    preset: string;
    safeMode: boolean;
    benchmarkMode: boolean;
    autoPerformanceController: boolean;
    controller: ReturnType<typeof getPerformanceControllerState>;
    featureModes: Record<string, "auto" | "on" | "off">;
    effectiveFeatures: Record<string, boolean>;
    guild: {
        anonymizedId: string | null;
        workloadClass: string | null;
    };
    hardware: ReturnType<typeof getHardwareContext>;
    sampling: ReturnType<typeof getActiveSamplingPlan>;
    quietOverhead: ReturnType<typeof getResourceBudgetSnapshot>;
    startup: ReturnType<typeof getStartupProfile>;
    lifecycle: ReturnType<typeof getLifecycleSnapshot>;
    memoryPressure: ReturnType<typeof getMemoryPressureLevel>;
    metrics: {
        ramMb: number;
        rendererRamMb: number;
        jsHeapUsedMb: number;
        jsHeapTotalMb: number;
        cpuPct: number;
        fps: number;
        frameP50Ms: number;
        frameP95Ms: number;
        frameP99Ms: number;
        longTasksPerMin: number;
        fluxPerSec: number;
        topFluxEvents: Array<{ type: string; count: number; }>;
        layoutDimensionsPerSec: number;
        messageCreatePerSec: number;
        typingPerSec: number;
        voiceStatePerSec: number;
    };
    process: Awaited<ReturnType<typeof readMetricsSnapshot>>;
    benchmarkWarnings: string[];
    stage5?: ReturnType<typeof captureQuietSelfProfile>;
}

export async function captureBenchmarkSnapshotV2(label = "manual", guildId?: string | null): Promise<BenchmarkSnapshotV2> {
    const [processMetrics, profiler, anonymizedId, guildProfile] = await Promise.all([
        readMetricsSnapshot(true),
        getProfilerSnapshot(),
        anonymizeGuildId(guildId ?? null),
        getGuildProfile(guildId ?? null),
    ]);

    const controller = getPerformanceControllerState();
    const sample = controller?.sample;
    const rates = sample
        ? {
            layoutDimensionsPerSec: sample.layoutDimensionsPerSec,
            messageCreatePerSec: sample.messageCreatePerSec,
            typingPerSec: sample.typingPerSec,
            voiceStatePerSec: sample.voicePerSec,
        }
        : {
            layoutDimensionsPerSec: 0,
            messageCreatePerSec: 0,
            typingPerSec: 0,
            voiceStatePerSec: 0,
        };

    const featureModes: Record<string, "auto" | "on" | "off"> = {};
    const effectiveFeatures: Record<string, boolean> = {};
    for (const f of AUTO_FEATURES) {
        featureModes[f] = getFeatureTriState(f);
        effectiveFeatures[f] = resolveFeatureEnabled(f, controller);
    }

    const hw = getHardwareContext();
    hw.disableGpuSetting = settings.store.disableGpu;

    const benchmarkWarnings: string[] = [];
    if (isPerformanceSafeMode()) {
        benchmarkWarnings.push("Safe Mode is ON — all experimental/AUTO optimizations are forced OFF; not valid for Stage 4 auto-tuning baseline.");
    }
    if (getBenchmarkSessionDurationSec() < 30) {
        benchmarkWarnings.push("Benchmark session duration under 30s — wait ~60s on target server before export for comparable results.");
    }
    if (settings.store.autoPerformanceController && !isPerformanceSafeMode()) {
        const anyEffective = Object.values(effectiveFeatures).some(Boolean);
        if (!anyEffective && controller?.mode && controller.mode !== "idle" && controller.mode !== "normal") {
            benchmarkWarnings.push("Controller reports load but no effective features active — check AUTO/ON/OFF modes.");
        }
    }

    return {
        schema: 2,
        label: getBenchmarkSessionLabel() ?? label,
        capturedAt: new Date().toISOString(),
        durationSec: getBenchmarkSessionDurationSec(),
        discordBuild: getBuildNumber(),
        quietGitHash: gitHash,
        preset: settings.store.profile,
        safeMode: isPerformanceSafeMode(),
        benchmarkMode: isBenchmarkMode(),
        autoPerformanceController: settings.store.autoPerformanceController,
        controller,
        featureModes,
        effectiveFeatures,
        guild: {
            anonymizedId,
            workloadClass: guildProfile?.class ?? controller?.guildClass ?? null,
        },
        hardware: hw,
        sampling: getActiveSamplingPlan(),
        quietOverhead: getResourceBudgetSnapshot(),
        startup: getStartupProfile(),
        lifecycle: getLifecycleSnapshot(),
        memoryPressure: getMemoryPressureLevel(),
        metrics: {
            ramMb: profiler.ramMb || processMetrics.ramMb,
            rendererRamMb: processMetrics.buckets.renderer.ramMb,
            jsHeapUsedMb: profiler.jsHeapUsedMb,
            jsHeapTotalMb: profiler.jsHeapTotalMb,
            cpuPct: processMetrics.cpu,
            fps: profiler.fps,
            frameP50Ms: profiler.frameP50Ms,
            frameP95Ms: profiler.frameP95Ms,
            frameP99Ms: profiler.frameP99Ms,
            longTasksPerMin: profiler.longTasksPerMin,
            fluxPerSec: profiler.fluxEventsPerSec,
            topFluxEvents: profiler.topFluxEvents,
            ...rates,
        },
        process: processMetrics,
        benchmarkWarnings,
        stage5: settings.store.deepProfiler ? captureQuietSelfProfile() : undefined,
    };
}
