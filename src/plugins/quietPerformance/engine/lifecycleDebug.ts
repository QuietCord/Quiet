/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "../settings";

export interface LifecycleSnapshot {
    timers: number;
    intervals: number;
    patched: boolean;
}

const timers = new Set<ReturnType<typeof setTimeout>>();
const intervals = new Set<ReturnType<typeof setInterval>>();

let patched = false;
let originalSetTimeout = window.setTimeout.bind(window);
let originalSetInterval = window.setInterval.bind(window);
let originalClearTimeout = window.clearTimeout.bind(window);
let originalClearInterval = window.clearInterval.bind(window);

export function getLifecycleSnapshot(): LifecycleSnapshot {
    return {
        timers: timers.size,
        intervals: intervals.size,
        patched,
    };
}

export function startLifecycleDebug() {
    if (patched || !settings.store.lifecycleDebug) return;
    patched = true;
    originalSetTimeout = window.setTimeout.bind(window);
    originalSetInterval = window.setInterval.bind(window);
    originalClearTimeout = window.clearTimeout.bind(window);
    originalClearInterval = window.clearInterval.bind(window);

    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        const id = originalSetTimeout(handler, timeout, ...args);
        timers.add(id);
        return id;
    }) as typeof window.setTimeout;

    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        const id = originalSetInterval(handler, timeout, ...args);
        intervals.add(id);
        return id;
    }) as typeof window.setInterval;

    window.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
        timers.delete(id);
        originalClearTimeout(id);
    }) as typeof window.clearTimeout;

    window.clearInterval = ((id: ReturnType<typeof setInterval>) => {
        intervals.delete(id);
        originalClearInterval(id);
    }) as typeof window.clearInterval;
}

export function stopLifecycleDebug() {
    if (!patched) return;
    window.setTimeout = originalSetTimeout;
    window.setInterval = originalSetInterval;
    window.clearTimeout = originalClearTimeout;
    window.clearInterval = originalClearInterval;
    patched = false;
    timers.clear();
    intervals.clear();
}

export function syncLifecycleDebug() {
    if (settings.store.lifecycleDebug) startLifecycleDebug();
    else stopLifecycleDebug();
}
