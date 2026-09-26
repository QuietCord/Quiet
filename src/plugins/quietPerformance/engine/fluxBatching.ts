/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxDispatcher } from "@webpack/common";

import { settings } from "../settings";

/** Per-channel row dimensions — safe to last-write-wins per channelId. */
const CHANNEL_ROW_TYPE = "UPDATE_CHANNEL_DIMENSIONS";
/** List scroll/height — must NOT collapse to one global payload. */
const CHANNEL_LIST_TYPE = "UPDATE_CHANNEL_LIST_DIMENSIONS";

const TYPING_TYPES = new Set([
    "TYPING_START",
    "TYPING_STOP",
]);

const FLUSH_LAYOUT_BEFORE = new Set([
    "MESSAGE_CREATE",
    "MESSAGE_UPDATE",
    "CHANNEL_SELECT",
    "CHANNEL_DELETE",
    "GUILD_DELETE",
]);

const DEFERRED_DISPATCH = Promise.resolve();
const MAX_LAYOUT_DEFER_MS = 48;

let installed = false;
let connectionReady = false;
let original: typeof FluxDispatcher.dispatch | null = null;

/** Last-write-wins per channel row. */
let rowCoalesce = new Map<string, unknown>();
/** All list-dimension updates in this frame (no global merge). */
let listDimensionQueue: unknown[] = [];
let typingQueue: unknown[] = [];
let rafHandle = 0;
let layoutSafetyTimer: ReturnType<typeof setTimeout> | null = null;

export function markFluxBatchingConnectionReady() {
    connectionReady = true;
}

export function resetFluxBatchingConnectionReady() {
    connectionReady = false;
    cancelRaf();
    clearLayoutSafetyTimer();
    flushAll();
}

function anyEnabled() {
    return settings.store.channelLayoutCoalesce || settings.store.batchTypingUpdates;
}

function rowKey(payload: { type?: string; channelId?: string; }) {
    if (payload.type !== CHANNEL_ROW_TYPE || !payload.channelId) return null;
    return payload.channelId;
}

function cancelRaf() {
    if (rafHandle) {
        cancelAnimationFrame(rafHandle);
        rafHandle = 0;
    }
}

function clearLayoutSafetyTimer() {
    if (layoutSafetyTimer) {
        clearTimeout(layoutSafetyTimer);
        layoutSafetyTimer = null;
    }
}

function scheduleLayoutSafetyFlush() {
    if (layoutSafetyTimer) return;
    layoutSafetyTimer = setTimeout(() => {
        layoutSafetyTimer = null;
        flushLayout();
    }, MAX_LAYOUT_DEFER_MS);
}

function flushLayout() {
    if (!original) return;
    clearLayoutSafetyTimer();

    if (rowCoalesce.size > 0) {
        const rows = rowCoalesce;
        rowCoalesce = new Map();
        for (const payload of rows.values()) {
            original(payload as { type?: string; });
        }
    }

    if (listDimensionQueue.length > 0) {
        const list = listDimensionQueue;
        listDimensionQueue = [];
        for (const payload of list) {
            original(payload as { type?: string; });
        }
    }
}

function flushTyping() {
    if (!original || typingQueue.length === 0) return;
    const batch = typingQueue;
    typingQueue = [];
    for (const payload of batch) {
        original(payload as { type?: string; });
    }
}

function flushAll() {
    flushLayout();
    flushTyping();
}

function hasPendingLayout() {
    return rowCoalesce.size > 0 || listDimensionQueue.length > 0;
}

function scheduleRafFlush() {
    if (rafHandle) return;
    rafHandle = requestAnimationFrame(() => {
        rafHandle = 0;
        flushAll();
    });
    scheduleLayoutSafetyFlush();
}

function deferLayout(payload: { type?: string; channelId?: string; guildId?: string; }) {
    if (payload.type === CHANNEL_LIST_TYPE) {
        listDimensionQueue.push(payload);
        if (listDimensionQueue.length > 64) flushLayout();
        else scheduleRafFlush();
        return;
    }

    if (payload.type === CHANNEL_ROW_TYPE) {
        const key = rowKey(payload);
        if (key) {
            rowCoalesce.set(key, payload);
            scheduleRafFlush();
            return;
        }
    }

    original!(payload);
}

function deferTyping(payload: unknown) {
    typingQueue.push(payload);
    if (typingQueue.length > 120) flushTyping();
    else scheduleRafFlush();
}

function isLayoutType(type: string) {
    return type === CHANNEL_LIST_TYPE || type === CHANNEL_ROW_TYPE;
}

function maybeFlushLayoutBefore(type: string | undefined) {
    if (!type || !settings.store.channelLayoutCoalesce || !hasPendingLayout()) return;
    if (!FLUSH_LAYOUT_BEFORE.has(type)) return;
    cancelRaf();
    flushLayout();
}

export function startFluxBatching() {
    if (installed) return;
    if (!anyEnabled()) return;
    installed = true;
    original = FluxDispatcher.dispatch.bind(FluxDispatcher);
    FluxDispatcher.dispatch = function (payload: { type?: string; channelId?: string; guildId?: string; }) {
        const type = payload?.type;

        if (anyEnabled() && connectionReady) {
            maybeFlushLayoutBefore(type);
        }

        if (!anyEnabled() || !connectionReady || !type) {
            return original!(payload);
        }

        if (settings.store.channelLayoutCoalesce && isLayoutType(type)) {
            deferLayout(payload);
            return DEFERRED_DISPATCH;
        }

        if (settings.store.batchTypingUpdates && TYPING_TYPES.has(type)) {
            deferTyping(payload);
            return DEFERRED_DISPATCH;
        }

        return original!(payload);
    };
}

export function stopFluxBatching() {
    if (!installed) return;
    cancelRaf();
    clearLayoutSafetyTimer();
    flushAll();
    if (original) FluxDispatcher.dispatch = original;
    original = null;
    installed = false;
    rowCoalesce.clear();
    listDimensionQueue = [];
    typingQueue = [];
}

export function syncFluxBatching() {
    stopFluxBatching();
    if (anyEnabled()) startFluxBatching();
}
