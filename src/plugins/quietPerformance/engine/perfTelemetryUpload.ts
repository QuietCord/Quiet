/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { buildAnonymousPerfTelemetry, postAnonymousPerfTelemetry } from "@api/SettingsSync/cloudTelemetry";
import { Logger } from "@utils/Logger";

import { getProfilerSnapshot } from "../profiler/collector";
import { readMetricsSnapshot } from "../metricsClient";
import { settings } from "../settings";
import { isBenchmarkMode, isPerformanceSafeMode } from "./stage4/featureControl";
import { getPerformanceControllerState } from "./stage4/performanceController";
import { getGuildProfile } from "./stage4/guildWorkload";
import { SelectedGuildStore } from "@webpack/common";

const logger = new Logger("QuietPerformance/Telemetry");

let uploadedThisSession = false;

export async function maybeUploadAnonymousPerfStats() {
    if (uploadedThisSession || !settings.store.shareAnonymousPerfStats) return;
    if (!Settings.cloud.authenticated) return;

    try {
        const [processMetrics, profiler, guildProfile] = await Promise.all([
            readMetricsSnapshot(false),
            getProfilerSnapshot(),
            getGuildProfile(SelectedGuildStore.getGuildId()),
        ]);

        const controller = getPerformanceControllerState();
        const guildClass = guildProfile?.class ?? controller?.guildClass ?? null;

        const body = buildAnonymousPerfTelemetry({
            guildClass,
            metrics: {
                ramMb: profiler.ramMb || processMetrics.ramMb,
                fps: profiler.fps,
                frameP95Ms: profiler.frameP95Ms,
                fluxPerSec: profiler.fluxEventsPerSec,
                longTasksPerMin: profiler.longTasksPerMin,
            },
            preset: settings.store.profile,
            safeMode: isPerformanceSafeMode(),
            benchmarkMode: isBenchmarkMode(),
        });

        if (await postAnonymousPerfTelemetry(body)) {
            uploadedThisSession = true;
            logger.info("Anonymous perf stats uploaded");
        }
    } catch (e) {
        logger.warn("Anonymous perf upload skipped", e);
    }
}

export function resetPerfTelemetrySession() {
    uploadedThisSession = false;
}
