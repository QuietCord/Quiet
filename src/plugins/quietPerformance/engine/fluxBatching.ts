/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { coalesceLatest, coalescePerFrame } from "./coalescingEngine";
import { isRuntimeFeatureEnabled } from "./runtimeEffective";
import {
    emitFluxPayload,
    getBaseFluxDispatch,
    setFluxMiddleware,
    type FluxDispatchFn,
    type FluxPayload,
} from "./stage5/instrumentationBus";

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
const MAX_LIST_QUEUE = 64;
const MAX_TYPING_QUEUE = 120;

let installed = false;
let connectionReady = false;
let layoutSafetyTimer: ReturnType<typeof setTimeout> | null = null;

let listFrame = coalescePerFrame<FluxPayload>(batch => {
    for (const payload of batch) emitFluxPayload(payload);
});

let rowLatest = coalesceLatest<string, FluxPayload>(
    payload => (payload.type === CHANNEL_ROW_TYPE && payload.channelId ? payload.channelId : null),
    payload => emitFluxPayload(payload),
);

let typingFrame = coalescePerFrame<FluxPayload>(batch => {
    for (const payload of batch) emitFluxPayload(payload);
});

export function markFluxBatchingConnectionReady() {
    connectionReady = true;
}

export function resetFluxBatchingConnectionReady() {
    connectionReady = false;
    cancelLayoutCoalescing();
    flushAll();
}

function anyEnabled() {
    return isRuntimeFeatureEnabled("channelLayoutCoalesce")
        || isRuntimeFeatureEnabled("batchTypingUpdates");
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

function cancelLayoutCoalescing() {
    listFrame.cancel();
    rowLatest.cancel();
    clearLayoutSafetyTimer();
}

function flushLayout() {
    clearLayoutSafetyTimer();
    rowLatest.flushNow();
    listFrame.flushNow();
}

function flushTyping() {
    typingFrame.flushNow();
}

function flushAll() {
    flushLayout();
    flushTyping();
}

function hasPendingLayout() {
    return rowLatest.pending() > 0 || listFrame.pending() > 0;
}

function scheduleLayoutWork() {
    scheduleLayoutSafetyFlush();
}

function deferLayout(payload: FluxPayload) {
    if (payload.type === CHANNEL_LIST_TYPE) {
        listFrame.push(payload);
        if (listFrame.pending() > MAX_LIST_QUEUE) flushLayout();
        else scheduleLayoutWork();
        return;
    }

    if (payload.type === CHANNEL_ROW_TYPE && payload.channelId) {
        rowLatest.push(payload);
        scheduleLayoutWork();
        return;
    }

    emitFluxPayload(payload);
}

function deferTyping(payload: FluxPayload) {
    typingFrame.push(payload);
    if (typingFrame.pending() > MAX_TYPING_QUEUE) flushTyping();
}

function isLayoutType(type: string) {
    return type === CHANNEL_LIST_TYPE || type === CHANNEL_ROW_TYPE;
}

function maybeFlushLayoutBefore(type: string | undefined) {
    if (!type || !hasPendingLayout() || !isRuntimeFeatureEnabled("channelLayoutCoalesce")) return;
    if (!FLUSH_LAYOUT_BEFORE.has(type)) return;
    cancelLayoutCoalescing();
    flushLayout();
}

function batchingMiddleware(payload: FluxPayload, next: FluxDispatchFn) {
    const type = payload?.type;

    if (anyEnabled() && connectionReady) {
        maybeFlushLayoutBefore(type);
    }

    if (!anyEnabled() || !connectionReady || !type) {
        return next(payload);
    }

    if (isRuntimeFeatureEnabled("channelLayoutCoalesce") && isLayoutType(type)) {
        deferLayout(payload);
        return DEFERRED_DISPATCH;
    }

    if (isRuntimeFeatureEnabled("batchTypingUpdates") && TYPING_TYPES.has(type)) {
        deferTyping(payload);
        return DEFERRED_DISPATCH;
    }

    return next(payload);
}

export function startFluxBatching() {
    if (installed) return;
    if (!anyEnabled()) return;
    installed = true;
    getBaseFluxDispatch();
    setFluxMiddleware(batchingMiddleware);
}

export function stopFluxBatching() {
    if (!installed) return;
    cancelLayoutCoalescing();
    flushAll();
    setFluxMiddleware(null);
    installed = false;
}

export function syncFluxBatching() {
    stopFluxBatching();
    if (anyEnabled()) startFluxBatching();
}
