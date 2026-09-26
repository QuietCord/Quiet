/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Per-frame batch flush (order preserved). */
export function coalescePerFrame<T>(flushBatch: (items: T[]) => void) {
    let queue: T[] = [];
    let raf = 0;

    function flushNow() {
        if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
        if (!queue.length) return;
        const batch = queue;
        queue = [];
        flushBatch(batch);
    }

    function push(item: T) {
        queue.push(item);
        if (!raf) {
            raf = requestAnimationFrame(() => {
                raf = 0;
                flushNow();
            });
        }
    }

    return { push, flushNow, cancel: () => { if (raf) cancelAnimationFrame(raf); raf = 0; }, pending: () => queue.length };
}

/** Last-write-wins per key, flushed on next frame (one item per key). */
export function coalesceLatest<K, T>(keyOf: (item: T) => K | null, flushOne: (item: T) => void) {
    let map = new Map<K, T>();
    let raf = 0;

    function flushNow() {
        if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
        if (!map.size) return;
        const entries = map;
        map = new Map();
        for (const item of entries.values()) flushOne(item);
    }

    function push(item: T) {
        const key = keyOf(item);
        if (key == null) {
            flushOne(item);
            return;
        }
        map.set(key, item);
        if (!raf) {
            raf = requestAnimationFrame(() => {
                raf = 0;
                flushNow();
            });
        }
    }

    return { push, flushNow, cancel: () => { if (raf) cancelAnimationFrame(raf); raf = 0; }, pending: () => map.size };
}

/** Fixed window batch (visual-only policies). */
export function batchWithinWindow<T>(windowMs: number, flushBatch: (items: T[]) => void) {
    let queue: T[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    function flushNow() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (!queue.length) return;
        const batch = queue;
        queue = [];
        flushBatch(batch);
    }

    function push(item: T) {
        queue.push(item);
        if (!timer) timer = setTimeout(flushNow, windowMs);
    }

    return { push, flushNow, pending: () => queue.length };
}

/** Drop intermediate visual updates inside minGapMs. */
export function throttleVisualUpdate<T>(minGapMs: number, handler: (item: T) => void) {
    let last = 0;
    let pending: T | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function flushPending() {
        timer = null;
        if (pending == null) return;
        const item = pending;
        pending = null;
        last = Date.now();
        handler(item);
    }

    return (item: T) => {
        const now = Date.now();
        if (now - last >= minGapMs) {
            last = now;
            handler(item);
            return;
        }
        pending = item;
        if (!timer) timer = setTimeout(flushPending, minGapMs - (now - last));
    };
}
