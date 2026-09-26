/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getMetricsSnapshot, startMetricsSampler } from "@main/metricsSampler";
import { session } from "electron";

export type { MetricsSnapshot, ProcessBucket, ProcessBucketTotals, ProcessUsage } from "@main/metricsSampler";

export { getMetricsSnapshot, startMetricsSampler };

export async function clearRendererCache() {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearCodeCaches({});
}
