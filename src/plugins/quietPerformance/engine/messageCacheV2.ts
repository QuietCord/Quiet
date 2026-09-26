/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SelectedChannelStore } from "@webpack/common";

import { isAbandonedChannel, isRecentChannel } from "./adaptiveBackground";
import { getMemoryPressureLevel } from "./memoryPressureState";
import { isQuietPerformanceActive } from "../active";
import { settings } from "../settings";

type Bucket = { channelId?: string; };

export function resolveMessageCacheCap(fallbackLimit: number, bucket?: Bucket | null) {
    if (!isQuietPerformanceActive() || !settings.store.trimMessageCache) return fallbackLimit;

    const channelId = bucket?.channelId ?? SelectedChannelStore.getChannelId();
    let cap: number;

    if (settings.store.messageCacheV2 && channelId) {
        const active = SelectedChannelStore.getChannelId();
        if (channelId === active) {
            cap = settings.store.activeChannelCacheCap;
        } else if (isRecentChannel(channelId)) {
            cap = settings.store.recentChannelCacheCap;
        } else if (isAbandonedChannel(channelId)) {
            cap = settings.store.abandonedChannelCacheCap;
        } else {
            cap = settings.store.inactiveChannelCacheCap;
        }

        const pressure = getMemoryPressureLevel();
        if (pressure === "pressure" && channelId !== active) cap = Math.min(cap, settings.store.inactiveChannelCacheCap);
        if (pressure === "high" && channelId !== active) cap = Math.min(cap, settings.store.abandonedChannelCacheCap);
    } else {
        cap = settings.store.messageCacheCap;
    }

    const n = Number(fallbackLimit);
    if (Number.isFinite(n)) return Math.min(n, cap);
    return cap;
}
