/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type StartupModuleTier = "critical" | "deferred" | "lazy";

export interface StartupModuleEntry {
    id: string;
    tier: StartupModuleTier;
    note: string;
}

/** Classification only — Stage 5 will act on this list. */
export const QUIET_PERFORMANCE_STARTUP_MODULES: StartupModuleEntry[] = [
    { id: "settings.core", tier: "critical", note: "Plugin settings + performance class toggles" },
    { id: "patchRegistration", tier: "critical", note: "Webpack patches for media/message caps" },
    { id: "optimizationSafety", tier: "critical", note: "Auto-disable experimental on repeated errors" },
    { id: "performanceController", tier: "critical", note: "Auto mode when enabled (minimal tick loop)" },
    { id: "fluxMetricsHook", tier: "deferred", note: "Flux sampling when controller/profiler needs it" },
    { id: "memoryPressure", tier: "deferred", note: "RAM tier polling when enabled" },
    { id: "performanceHistory", tier: "deferred", note: "Ring buffer writes from controller" },
    { id: "pluginCostProfiler", tier: "deferred", note: "Static plugin metadata scan" },
    { id: "PerformanceAutoPanel", tier: "lazy", note: "Settings UI explanation" },
    { id: "PerformanceHistoryPanel", tier: "lazy", note: "History table UI" },
    { id: "benchmarkExport", tier: "lazy", note: "Snapshot V2 + baseline compare" },
    { id: "reactRenderProfiler", tier: "lazy", note: "Deep React render counts (opt-in)" },
    { id: "ProfilerPanel", tier: "lazy", note: "Overlay profiler UI" },
];

export function modulesByTier(tier: StartupModuleTier) {
    return QUIET_PERFORMANCE_STARTUP_MODULES.filter(m => m.tier === tier);
}
