/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { applyPerformanceClasses, settings } from "../settings";

const RECENT_MAX = 8;
const ABANDONED_MS = 20 * 60 * 1000;
const LEVEL2_MS = 45_000;
const LEVEL3_MS = 120_000;

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
let backgroundSince = 0;
let backgroundLevel: 0 | 1 | 2 | 3 = 0;
let started = false;
let levelTimer: ReturnType<typeof setInterval> | null = null;

export function isBackgroundMode() {
    return background;
}

export function getBackgroundLevel() {
    return backgroundLevel;
}

function computeBackground() {
    if (!settings.store.adaptiveBackground) return false;
    if (document.hidden) return true;
    if (typeof document.hasFocus === "function" && !document.hasFocus()) return true;
    return false;
}

function applyBackgroundClasses() {
    const nextBg = computeBackground();
    if (nextBg && !background) {
        backgroundSince = Date.now();
        backgroundLevel = 1;
    }
    if (!nextBg) {
        backgroundSince = 0;
        backgroundLevel = 0;
    }
    background = nextBg;

    document.documentElement.classList.toggle("vc-quiet-perf-background", background);
    document.documentElement.dataset.vcQuietBgLevel = background ? String(backgroundLevel) : "";

    document.documentElement.classList.toggle("vc-quiet-perf-bg-l1", backgroundLevel >= 1);
    document.documentElement.classList.toggle("vc-quiet-perf-bg-l2", backgroundLevel >= 2);
    document.documentElement.classList.toggle("vc-quiet-perf-bg-l3", backgroundLevel >= 3);

    if (background && settings.store.adaptiveBackground) {
        document.documentElement.classList.add("vc-quiet-perf-motion", "vc-quiet-perf-no-gif");
    } else {
        applyPerformanceClasses();
    }
}

function refreshBackgroundLevel() {
    if (!background || !backgroundSince) {
        if (backgroundLevel !== 0) {
            backgroundLevel = 0;
            applyBackgroundClasses();
        }
        return;
    }
    const elapsed = Date.now() - backgroundSince;
    let next: 0 | 1 | 2 | 3 = 1;
    if (elapsed >= LEVEL3_MS) next = 3;
    else if (elapsed >= LEVEL2_MS) next = 2;
    if (next !== backgroundLevel) {
        backgroundLevel = next;
        applyBackgroundClasses();
    }
}

export function startAdaptiveBackground() {
    if (started) return;
    started = true;
    applyBackgroundClasses();
    document.addEventListener("visibilitychange", applyBackgroundClasses);
    window.addEventListener("focus", applyBackgroundClasses);
    window.addEventListener("blur", applyBackgroundClasses);
    levelTimer = setInterval(refreshBackgroundLevel, 5000);
}

export function refreshAdaptiveBackground() {
    applyBackgroundClasses();
    refreshBackgroundLevel();
}

export function stopAdaptiveBackground() {
    if (!started) return;
    started = false;
    if (levelTimer) clearInterval(levelTimer);
    levelTimer = null;
    document.removeEventListener("visibilitychange", applyBackgroundClasses);
    window.removeEventListener("focus", applyBackgroundClasses);
    window.removeEventListener("blur", applyBackgroundClasses);
    document.documentElement.classList.remove("vc-quiet-perf-background", "vc-quiet-perf-bg-l1", "vc-quiet-perf-bg-l2", "vc-quiet-perf-bg-l3");
    delete document.documentElement.dataset.vcQuietBgLevel;
}
