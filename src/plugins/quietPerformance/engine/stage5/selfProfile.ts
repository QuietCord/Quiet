/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getResourceBudgetSnapshot } from "../resourceBudget";
import { getInstrumentationDiagnostics } from "./instrumentationBus";
import { getFluxAttribution } from "./fluxAttribution";
import { getLoafSamples, isLoafSupported } from "./loafAttribution";
import { getWebpackModuleStats } from "./webpackModuleProfiler";
import { getWebpackSearchStats } from "./webpackSearchProfiler";
import { summarizePatchHealth } from "@shared/quietPatchHealth";
import { logPatchHealth } from "../../patchHealthReport";

export interface QuietSelfProfileSnapshot {
    overhead: ReturnType<typeof getResourceBudgetSnapshot>;
    instrumentation: ReturnType<typeof getInstrumentationDiagnostics>;
    patchHealth: ReturnType<typeof summarizePatchHealth>;
    webpackModules: ReturnType<typeof getWebpackModuleStats>;
    webpackSearch: ReturnType<typeof getWebpackSearchStats>;
    fluxAttribution: ReturnType<typeof getFluxAttribution>;
    loafSupported: boolean;
    loafSamples: ReturnType<typeof getLoafSamples>;
}

export function captureQuietSelfProfile(): QuietSelfProfileSnapshot {
    logPatchHealth();
    return {
        overhead: getResourceBudgetSnapshot(),
        instrumentation: getInstrumentationDiagnostics(),
        patchHealth: summarizePatchHealth("QuietPerformance"),
        webpackModules: getWebpackModuleStats(10),
        webpackSearch: getWebpackSearchStats(6),
        fluxAttribution: getFluxAttribution(8),
        loafSupported: isLoafSupported(),
        loafSamples: getLoafSamples(3),
    };
}
