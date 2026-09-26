/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const marks = {
    pluginStart: 0,
    connectionOpen: 0,
    uiReady: 0,
};

let webpackModulesExecuted = 0;

let pluginStarted = false;

export function markQuietPerfPluginStart() {
    marks.pluginStart = performance.now();
    marks.connectionOpen = 0;
    marks.uiReady = 0;
    webpackModulesExecuted = 0;
    pluginStarted = true;
}

export function markQuietPerfConnectionOpen() {
    if (!pluginStarted) return;
    if (!marks.connectionOpen) marks.connectionOpen = performance.now();
}

export function markQuietPerfUiReady() {
    if (!pluginStarted) return;
    if (!marks.uiReady) marks.uiReady = performance.now();
}

export function markQuietPerfWebpackModuleExecuted() {
    webpackModulesExecuted++;
}

export function classifyWebpackLoadPhase(now = performance.now()): "pre-connection" | "pre-ui" | "runtime" {
    if (marks.uiReady && now <= marks.uiReady) return "pre-ui";
    if (marks.connectionOpen && now <= marks.connectionOpen) return "pre-connection";
    return "runtime";
}

export function getStartupProfile() {
    const msToConnectionOpen = marks.connectionOpen && marks.pluginStart
        ? Math.round(marks.connectionOpen - marks.pluginStart)
        : null;
    const msToUiReady = marks.uiReady && marks.pluginStart
        ? Math.round(marks.uiReady - marks.pluginStart)
        : null;

    return {
        /** Ms since navigation start when QuietPerformance start() ran */
        msSinceNavigationAtPluginStart: marks.pluginStart ? Math.round(marks.pluginStart) : null,
        msPluginStartToConnectionOpen: msToConnectionOpen != null && msToConnectionOpen >= 0
            ? msToConnectionOpen
            : null,
        msPluginStartToUiReady: msToUiReady != null && msToUiReady >= 0 ? msToUiReady : null,
        webpackModulesExecuted,
    };
}
