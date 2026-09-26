/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { applyPerformanceClasses, settings } from "../settings";

const RECENT_MAX = 8;
const ABANDONED_MS = 20 * 60 * 1000;
const recentChannels: string[] = [];
const channelLastVisit = new Map<string, number>();

export function noteChannelVisit(channelId: string | null | undefined) {
    if (!channelId) return;
    channelLastVisit.set(channelId, Date.now());
    const idx = recentChannels.indexOf(channelId);
    if (idx >= 0) recentChannels.splice(idx, 1);
    recentChannels.unshift(channelId);
    if (recentChannels.length > RECENT_MAX) recentChannels.length = RECENT_MAX;
}

export function isRecentChannel(channelId: string) {
    return recentChannels.includes(channelId);
}

export function isAbandonedChannel(channelId: string) {
    if (isRecentChannel(channelId)) return false;
    const last = channelLastVisit.get(channelId);
    if (!last) return true;
    return Date.now() - last > ABANDONED_MS;
}

let background = false;
let started = false;

export function isBackgroundMode() {
    return background;
}

function computeBackground() {
    if (!settings.store.adaptiveBackground) return false;
    if (document.hidden) return true;
    if (typeof document.hasFocus === "function" && !document.hasFocus()) return true;
    return false;
}

function applyBackgroundClasses() {
    background = computeBackground();
    document.documentElement.classList.toggle("vc-quiet-perf-background", background);
    if (background && settings.store.adaptiveBackground) {
        document.documentElement.classList.add("vc-quiet-perf-motion", "vc-quiet-perf-no-gif");
    } else {
        applyPerformanceClasses();
    }
}

export function startAdaptiveBackground() {
    if (started) return;
    started = true;
    applyBackgroundClasses();
    document.addEventListener("visibilitychange", applyBackgroundClasses);
    window.addEventListener("focus", applyBackgroundClasses);
    window.addEventListener("blur", applyBackgroundClasses);
}

export function refreshAdaptiveBackground() {
    applyBackgroundClasses();
}

export function stopAdaptiveBackground() {
    if (!started) return;
    started = false;
    document.removeEventListener("visibilitychange", applyBackgroundClasses);
    window.removeEventListener("focus", applyBackgroundClasses);
    window.removeEventListener("blur", applyBackgroundClasses);
    document.documentElement.classList.remove("vc-quiet-perf-background");
}
