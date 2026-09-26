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
};

function channelMap(): Map<string, ChannelBucket> | null {
    const raw = MessageCache as { _channelMessages?: Map<string, ChannelBucket>; };
    return raw._channelMessages ?? null;
}

/** Drop cached messages for channels you are not viewing (Discord keeps thousands in RAM). */
export function trimInactiveMessageCaches() {
    if (!settings.store.trimMessageCache) return;

    const cap = settings.store.messageCacheCap;
    const active = SelectedChannelStore.getChannelId();
    const map = channelMap();
    if (!map) return;

    let trimmed = 0;
    for (const [channelId, bucket] of map) {
        if (channelId === active || !bucket?._array?.length) continue;
        while (bucket._array.length > cap) {
            const head = bucket._array.shift();
            if (head?.id && bucket._map) delete bucket._map[head.id];
            trimmed++;
        }
    }

    return trimmed;
}

export function startMessageCacheJanitor() {
    trimInactiveMessageCaches();
    return setInterval(() => trimInactiveMessageCaches(), 45_000);
}
