/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getBuildNumber } from "@webpack/patcher";

import { readMetricsSnapshot } from "../metricsClient";
import { getProfilerSnapshot } from "../profiler/collector";
import { settings } from "../settings";
import { getLifecycleSnapshot } from "./lifecycleDebug";
import { getStartupProfile } from "./startupProfile";
import { getMemoryPressureLevel } from "./memoryPressureState";

export async function captureBenchmarkSnapshot(label = "manual") {
    const [processMetrics, profiler] = await Promise.all([
        readMetricsSnapshot(true),
        getProfilerSnapshot(),
    ]);

    return {
        label,
        capturedAt: new Date().toISOString(),
        discordBuild: getBuildNumber(),
        quietProfile: settings.store.profile,
        memoryPressure: getMemoryPressureLevel(),
        startup: getStartupProfile(),
        lifecycle: getLifecycleSnapshot(),
        process: processMetrics,
        renderer: profiler,
    };
}

export async function copyBenchmarkToClipboard() {
    const data = await captureBenchmarkSnapshot("benchmark");
    const text = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(text);
    return text;
}
