/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { resetRotation, tickRotation } from "./rotation";
import { setQuietPresence } from "./rpc";
import { settings } from "./settings";

let rotateTimer: ReturnType<typeof setInterval> | null = null;
let presenceSessionStart = Date.now();

export function getPresenceSessionStart() {
    return presenceSessionStart;
}

function intervalMs() {
    const sec = settings.store.rotateIntervalSec ?? 15;
    return Math.min(120, Math.max(5, sec)) * 1000;
}

export function startPresenceRotation() {
    stopPresenceRotation();
    resetRotation();
    presenceSessionStart = Date.now();
    if (settings.store.rotateEnabled === false) return;

    rotateTimer = setInterval(() => {
        tickRotation();
        void setQuietPresence();
    }, intervalMs());
}

export function stopPresenceRotation() {
    if (rotateTimer) clearInterval(rotateTimer);
    rotateTimer = null;
}

export function restartPresenceRotation() {
    stopPresenceRotation();
    startPresenceRotation();
}
