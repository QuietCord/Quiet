/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageCache, SelectedChannelStore } from "@webpack/common";

import { resolveMessageCacheCap } from "./engine/messageCacheV2";
import { isQuietPerformanceActive } from "./active";
import { settings } from "./settings";

type ChannelBucket = {
    _array?: { id: string; }[];
    _map?: Record<string, unknown>;
    truncateTop?: (limit: number) => void;
};

function channelMap(): unknown {
    try {
        const raw = MessageCache as { _channelMessages?: unknown; };
        return raw._channelMessages ?? null;
    } catch {
        return null;
    }
}

function* channelEntries(map: unknown): Generator<[string, ChannelBucket]> {
    if (!map || typeof map !== "object") return;
    if (map instanceof Map) {
        for (const entry of map) {
            if (Array.isArray(entry) && entry.length >= 2)
                yield [String(entry[0]), entry[1] as ChannelBucket];
        }
        return;
    }
    const maybe = map as {
        entries?: () => Iterable<[string, ChannelBucket]>;
        forEach?: (fn: (value: ChannelBucket, key: string) => void) => void;
    };
    if (typeof maybe.entries === "function") {
        for (const [channelId, bucket] of maybe.entries()) yield [channelId, bucket];
        return;
    }
    if (typeof maybe.forEach === "function") {
        const pairs: [string, ChannelBucket][] = [];
        maybe.forEach((bucket, channelId) => {
            pairs.push([channelId, bucket]);
        });
        for (const pair of pairs) yield pair;
        return;
    }
    for (const [channelId, bucket] of Object.entries(map as Record<string, ChannelBucket>))
        yield [channelId, bucket];
}

/**
 * Fallback when truncateTop patch is not enough for inactive channels.
 * Prefer Discord's truncateTop; bulk-splice only if internals are present.
 */
export function trimInactiveMessageCaches() {
    if (!isQuietPerformanceActive() || !settings.store.trimMessageCache) return 0;

    const active = SelectedChannelStore.getChannelId();
    const map = channelMap();
    if (!map) return 0;

    let trimmed = 0;
    for (const [channelId, bucket] of channelEntries(map)) {
        if (channelId === active || !bucket?._array?.length) continue;
        const cap = resolveMessageCacheCap(bucket._array.length, { channelId });
        const excess = bucket._array.length - cap;
        if (excess <= 0) continue;

        if (typeof bucket.truncateTop === "function") {
            try {
                bucket.truncateTop(cap);
                continue;
            } catch {
                // fall through
            }
        }

        if (!bucket._map) continue;

        const removed = bucket._array.splice(0, excess);
        for (const msg of removed) {
            if (msg?.id) delete bucket._map[msg.id];
        }
        trimmed += removed.length;
    }

    return trimmed;
}
