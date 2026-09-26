/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { installDevOverlayPatch, resetDevOverlay, tickDevOverlay, uninstallDevOverlayPatch } from "./devOverlay";
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

function syncDevOverlayPatch() {
    uninstallDevOverlayPatch();
    if (settings.store.devOverlayEnabled === true) installDevOverlayPatch();
}

export function startPresenceRotation() {
    stopPresenceRotation();
    resetRotation();
    resetDevOverlay();
    presenceSessionStart = Date.now();
    syncDevOverlayPatch();

    const needsTimer =
        settings.store.rotateEnabled !== false ||
        settings.store.devOverlayEnabled === true;
    if (!needsTimer) return;

    rotateTimer = setInterval(() => {
        if (settings.store.rotateEnabled !== false) {
            tickRotation();
            void setQuietPresence();
        }
        if (settings.store.devOverlayEnabled === true) tickDevOverlay();
    }, intervalMs());
}

export function stopPresenceRotation() {
    if (rotateTimer) clearInterval(rotateTimer);
    rotateTimer = null;
    uninstallDevOverlayPatch();
}

export function restartPresenceRotation() {
    stopPresenceRotation();
    startPresenceRotation();
}
