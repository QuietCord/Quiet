/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "../../settings";
import { clearFluxAttribution, getFluxAttribution, startFluxAttribution, stopFluxAttribution } from "./fluxAttribution";
import { getLoafSamples, isLoafSupported, startLoafAttribution, stopLoafAttribution } from "./loafAttribution";
import { captureQuietSelfProfile } from "./selfProfile";
import {
    clearWebpackModuleStats,
    getWebpackModuleStats,
    startWebpackModuleProfiler,
    stopWebpackModuleProfiler,
} from "./webpackModuleProfiler";
import {
    clearWebpackSearchStats,
    getWebpackSearchStats,
    startWebpackSearchProfiler,
    stopWebpackSearchProfiler,
} from "./webpackSearchProfiler";
import { registerDiagnostic } from "./instrumentationBus";

let active = false;
let diagnosticRegistered = false;

function ensureDiagnostic() {
    if (diagnosticRegistered) return;
    diagnosticRegistered = true;
    registerDiagnostic("stage5DeepProfiler", () => ({
        active,
        webpackModulesTracked: getWebpackModuleStats(3).length,
        webpackSearchMethods: getWebpackSearchStats(3).length,
        topFlux: getFluxAttribution(3).map(r => `${r.type}×${r.count}`),
        loafSupported: isLoafSupported(),
        lastLoaf: getLoafSamples(1)[0] ?? null,
    }));
}

export function isDeepProfilerActive() {
    return active;
}

export function syncDeepProfiler() {
    const want = settings.store.deepProfiler;
    if (want && !active) {
        active = true;
        ensureDiagnostic();
        startWebpackModuleProfiler();
        startWebpackSearchProfiler();
        startFluxAttribution();
        startLoafAttribution();
        return;
    }
    if (!want && active) {
        active = false;
        stopWebpackModuleProfiler();
        stopWebpackSearchProfiler();
        stopFluxAttribution();
        stopLoafAttribution();
    }
}

export function stopDeepProfiler() {
    if (!active) return;
    active = false;
    stopWebpackModuleProfiler();
    stopWebpackSearchProfiler();
    stopFluxAttribution();
    stopLoafAttribution();
}

export function resetDeepProfilerSamples() {
    clearWebpackModuleStats();
    clearWebpackSearchStats();
    clearFluxAttribution();
}

export { captureQuietSelfProfile, getFluxAttribution, getLoafSamples, getWebpackModuleStats, getWebpackSearchStats };
