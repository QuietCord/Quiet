/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getBuildNumber } from "@webpack/patcher";

import { captureBenchmarkSnapshotV2 } from "./benchmarkSnapshotV2";
import {
    clearBenchmarkBaseline,
    compareBenchmarkSnapshots,
    formatComparisonSummary,
    getBenchmarkBaseline,
    saveBenchmarkBaseline,
} from "./baselineRegressionV2";
import { logPatchHealth } from "../patchHealthReport";
import { settings } from "../settings";

export interface RecoveryAssessment {
    discordBuild: number;
    baselineBuild: number | null;
    baselineCapturedAt: string | null;
    buildDrift: boolean;
    brokenPatchCount: number;
    appliedPatchCount: number;
    activePatchCount: number;
    needsAttention: boolean;
    reasons: string[];
    safeMode: boolean;
}

export async function assessQuietRecovery(): Promise<RecoveryAssessment> {
    const patch = logPatchHealth("QuietPerformance");
    const baseline = await getBenchmarkBaseline();
    const discordBuild = getBuildNumber();
    const baselineBuild = baseline?.discordBuild ?? null;

    const reasons: string[] = [];
    if (patch.broken.length > 0) {
        reasons.push(`${patch.broken.length} webpack patch(es) not applied on build ${discordBuild}`);
    }
    if (baselineBuild != null && baselineBuild !== discordBuild) {
        reasons.push(`Discord build changed (${baselineBuild} → ${discordBuild}) since Stage 4 baseline`);
    }
    if (settings.store.performanceSafeMode) {
        reasons.push("Safe Mode is on — experimental/AUTO features are forced off");
    }

    const needsAttention =
        patch.broken.length > 0
        || (baselineBuild != null && baselineBuild !== discordBuild);

    return {
        discordBuild,
        baselineBuild,
        baselineCapturedAt: baseline?.capturedAt ?? null,
        buildDrift: baselineBuild != null && baselineBuild !== discordBuild,
        brokenPatchCount: patch.broken.length,
        appliedPatchCount: patch.applied.length,
        activePatchCount: patch.active.length,
        needsAttention,
        reasons,
        safeMode: settings.store.performanceSafeMode,
    };
}

/**
 * One-click recovery: Safe Mode on + patch health logged. Does not change presets/CDN.
 */
export async function runQuietRecovery() {
    if (!settings.store.performanceSafeMode) {
        settings.store.performanceSafeMode = true;
    }
    const patch = logPatchHealth("QuietPerformance");
    const assessment = await assessQuietRecovery();
    return { assessment, patch };
}

export async function rebaselineStage4(guildId?: string | null) {
    const snap = await captureBenchmarkSnapshotV2("stage4-recovery-baseline", guildId);
    await saveBenchmarkBaseline(snap);
    return snap;
}

export async function compareToStage4Baseline(guildId?: string | null) {
    const baseline = await getBenchmarkBaseline();
    if (!baseline) return null;
    const after = await captureBenchmarkSnapshotV2("stage4-recovery-compare", guildId);
    return compareBenchmarkSnapshots(baseline, after);
}

export async function clearStage4Baseline() {
    await clearBenchmarkBaseline();
}

export { formatComparisonSummary };
