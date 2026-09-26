/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FluxDispatcher } from "@webpack/common";

export type FluxPayload = { type?: string; channelId?: string; guildId?: string; };
export type FluxDispatchFn = (payload: FluxPayload) => unknown;
export type FluxMiddleware = (payload: FluxPayload, next: FluxDispatchFn) => unknown;

export type FluxObserver = (payload: FluxPayload) => void;
export type LongTaskObserver = (entry: PerformanceEntry) => void;
export type FrameObserver = (deltaMs: number, now: number) => void;

let installed = false;
let baseDispatch: FluxDispatchFn | null = null;
let middleware: FluxMiddleware | null = null;

const fluxObservers = new Set<FluxObserver>();
const longTaskObservers = new Set<LongTaskObserver>();
const frameObservers = new Set<FrameObserver>();
const diagnostics = new Set<{ id: string; sample: () => Record<string, unknown>; }>();

let longTaskObserver: PerformanceObserver | null = null;
let frameRaf = 0;
let lastFrame = 0;

function notifyFlux(payload: FluxPayload) {
    if (!payload?.type || fluxObservers.size === 0) return;
    for (const o of fluxObservers) o(payload);
}

function defaultNext(payload: FluxPayload) {
    return baseDispatch!(payload);
}

function dispatchChain(payload: FluxPayload) {
    notifyFlux(payload);
    if (middleware) return middleware(payload, defaultNext);
    return defaultNext(payload);
}

export function ensureInstrumentationBus() {
    if (installed) return;
    installed = true;
    baseDispatch = FluxDispatcher.dispatch.bind(FluxDispatcher) as FluxDispatchFn;
    FluxDispatcher.dispatch = dispatchChain as typeof FluxDispatcher.dispatch;
}

export function getBaseFluxDispatch(): FluxDispatchFn {
    ensureInstrumentationBus();
    return baseDispatch!;
}

export function observeFlux(observer: FluxObserver) {
    fluxObservers.add(observer);
    ensureInstrumentationBus();
    return () => {
        fluxObservers.delete(observer);
    };
}

export function setFluxMiddleware(next: FluxMiddleware | null) {
    middleware = next;
    ensureInstrumentationBus();
}

export function observeLongTask(observer: LongTaskObserver) {
    longTaskObservers.add(observer);
    ensureLongTaskObserver();
    return () => longTaskObservers.delete(observer);
}

function ensureLongTaskObserver() {
    if (longTaskObserver || typeof PerformanceObserver === "undefined" || longTaskObservers.size === 0) return;
    try {
        longTaskObserver = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                for (const o of longTaskObservers) o(entry);
            }
        });
        longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch {
        longTaskObserver = null;
    }
}

export function observeFrame(observer: FrameObserver) {
    frameObservers.add(observer);
    if (!frameRaf) frameRaf = requestAnimationFrame(frameLoop);
    return () => {
        frameObservers.delete(observer);
        if (frameObservers.size === 0 && frameRaf) {
            cancelAnimationFrame(frameRaf);
            frameRaf = 0;
            lastFrame = 0;
        }
    };
}

function frameLoop(now: number) {
    if (lastFrame && frameObservers.size) {
        const dt = now - lastFrame;
        for (const o of frameObservers) o(dt, now);
    }
    lastFrame = now;
    frameRaf = requestAnimationFrame(frameLoop);
}

export function registerDiagnostic(id: string, sample: () => Record<string, unknown>) {
    diagnostics.add({ id, sample });
    return () => diagnostics.delete({ id, sample });
}

export function getInstrumentationDiagnostics() {
    const out: Record<string, Record<string, unknown>> = {};
    for (const d of diagnostics) out[d.id] = d.sample();
    return {
        fluxObservers: fluxObservers.size,
        longTaskObservers: longTaskObservers.size,
        frameObservers: frameObservers.size,
        hasMiddleware: middleware != null,
        modules: out,
    };
}

/** Optimization policies register middleware; observers stay passive. */
export function registerOptimizationPolicy(name: string, policy: FluxMiddleware | null) {
    setFluxMiddleware(policy);
    return () => {
        if (middleware === policy) setFluxMiddleware(null);
    };
}

/** Flush deferred payloads without re-entering optimization middleware. */
export function emitFluxPayload(payload: FluxPayload) {
    ensureInstrumentationBus();
    notifyFlux(payload);
    return baseDispatch!(payload);
}

export function isInstrumentationBusInstalled() {
    return installed;
}
