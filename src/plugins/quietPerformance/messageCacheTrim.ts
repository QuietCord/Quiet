/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageCache, SelectedChannelStore } from "@webpack/common";

import { settings } from "./settings";

type ChannelBucket = {
    _array?: { id: string; }[];
    _map?: Record<string, unknown>;
    truncateTop?: (limit: number) => void;
};

function channelMap(): Map<string, ChannelBucket> | null {
    try {
        const raw = MessageCache as { _channelMessages?: Map<string, ChannelBucket>; };
        return raw._channelMessages ?? null;
    } catch {
        return null;
    }
}

/**
 * Fallback when truncateTop patch is not enough for inactive channels.
 * Prefer Discord's truncateTop; bulk-splice only if internals are present.
 */
export function trimInactiveMessageCaches() {
    if (!settings.store.trimMessageCache) return 0;

    const cap = settings.store.messageCacheCap;
    const active = SelectedChannelStore.getChannelId();
    const map = channelMap();
    if (!map) return 0;

    let trimmed = 0;
    for (const [channelId, bucket] of map) {
        if (channelId === active || !bucket?._array?.length) continue;
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
