/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { observeFlux } from "./instrumentationBus";

/** Heuristic map — measurement only, not authoritative store graph. */
const FLUX_HINTS: Record<string, { stores: string[]; ui: string[]; }> = {
    MESSAGE_CREATE: { stores: ["MessageStore"], ui: ["Message", "Channel unread"] },
    MESSAGE_UPDATE: { stores: ["MessageStore"], ui: ["Message"] },
    MESSAGE_DELETE: { stores: ["MessageStore"], ui: ["Message list"] },
    TYPING_START: { stores: ["TypingStore"], ui: ["Typing indicator"] },
    PRESENCE_UPDATES: { stores: ["PresenceStore", "UserStore"], ui: ["Member list", "Avatar status"] },
    VOICE_STATE_UPDATES: { stores: ["VoiceStateStore"], ui: ["Voice channel UI"] },
    UPDATE_CHANNEL_LIST_DIMENSIONS: { stores: ["ChannelListStore"], ui: ["ChannelRow", "Sidebar layout"] },
    UPDATE_CHANNEL_DIMENSIONS: { stores: ["ChannelStore"], ui: ["Channel list layout"] },
    GUILD_MEMBER_LIST_UPDATE: { stores: ["GuildMemberStore"], ui: ["MemberListItem"] },
    GUILD_ROLE_UPDATE: { stores: ["GuildRoleStore"], ui: ["Role pills", "Member list"] },
};

export interface FluxAttributionRow {
    type: string;
    count: number;
    stores: string[];
    ui: string[];
}

const counts = new Map<string, number>();
let stopObserve: (() => void) | null = null;

export function startFluxAttribution() {
    if (stopObserve) return;
    stopObserve = observeFlux(payload => {
        const type = payload?.type;
        if (!type) return;
        counts.set(type, (counts.get(type) ?? 0) + 1);
    });
}

export function stopFluxAttribution() {
    stopObserve?.();
    stopObserve = null;
}

export function getFluxAttribution(limit = 8): FluxAttributionRow[] {
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([type, count]) => {
            const hint = FLUX_HINTS[type];
            return {
                type,
                count,
                stores: hint?.stores ?? ["(unknown)"],
                ui: hint?.ui ?? ["(unknown)"],
            };
        });
}

export function clearFluxAttribution() {
    counts.clear();
}
