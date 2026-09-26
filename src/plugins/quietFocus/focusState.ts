/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showToast, Toasts } from "@webpack/common";

import { applyFocusOptionClasses } from "./applyFocusClasses";
import { settings } from "./settings";

export interface FocusSession {
    active: boolean;
    startedAt: number;
    expiresAt: number | null;
    dmsAndMentions: boolean;
}

let session: FocusSession = {
    active: false,
    startedAt: 0,
    expiresAt: null,
    dmsAndMentions: false,
};

let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function notify() {
    for (const l of listeners) l();
}

function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
}

function scheduleExpiry() {
    clearTimer();
    if (!session.active || session.expiresAt == null) return;
    const ms = session.expiresAt - Date.now();
    if (ms <= 0) {
        endFocus(true);
        return;
    }
    timer = setTimeout(() => endFocus(true), ms);
}

export function getFocusSession() {
    return { ...session };
}

export function subscribeFocusSession(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

export function syncFocusDom() {
    const root = document.documentElement;
    root.classList.toggle("vc-focus-mode", session.active);
    root.classList.toggle("vc-focus-dms-mentions", session.active && session.dmsAndMentions);
    root.dataset.vcFocusActive = session.active ? "1" : "0";
    if (session.active && session.expiresAt) {
        root.dataset.vcFocusExpires = String(session.expiresAt);
    } else {
        delete root.dataset.vcFocusExpires;
    }
    applyFocusOptionClasses();
}

export function startFocus(opts?: { dmsAndMentions?: boolean; durationMin?: number; }) {
    const durationMin = opts?.durationMin ?? settings.store.sessionDurationMin;
    const dmsAndMentions = opts?.dmsAndMentions ?? settings.store.dmsAndMentionsOnly;
    const now = Date.now();
    session = {
        active: true,
        startedAt: now,
        expiresAt: durationMin > 0 ? now + durationMin * 60_000 : null,
        dmsAndMentions,
    };
    syncFocusDom();
    scheduleExpiry();
    notify();
    showToast(
        dmsAndMentions
            ? `Focus Mode — DMs + mentions (${durationMin > 0 ? `${durationMin}m` : "until off"})`
            : `Focus Mode — minimal UI (${durationMin > 0 ? `${durationMin}m` : "until off"})`,
        Toasts.Type.SUCCESS,
    );
}

export function endFocus(fromTimer = false) {
    if (!session.active) return;
    session = { active: false, startedAt: 0, expiresAt: null, dmsAndMentions: false };
    clearTimer();
    syncFocusDom();
    notify();
    if (fromTimer) showToast("Focus Mode ended — full UI restored", Toasts.Type.MESSAGE);
}

export function isFocusActive() {
    return session.active;
}

export function toggleFocus(opts?: { dmsAndMentions?: boolean; durationMin?: number; }) {
    if (session.active) {
        endFocus();
        return;
    }
    if (opts) {
        startFocus(opts);
        return;
    }
    startFocus({
        dmsAndMentions: settings.store.dmsAndMentionsOnly,
        durationMin: 0,
    });
}

export function remainingMs() {
    if (!session.active || session.expiresAt == null) return null;
    return Math.max(0, session.expiresAt - Date.now());
}
