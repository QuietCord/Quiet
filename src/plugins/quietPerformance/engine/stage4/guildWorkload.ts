/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

import type { GuildWorkloadClass, PerformanceSample } from "./types";

const STORE_KEY = "QuietPerformance_guildProfiles";

export interface GuildProfile {
    guildId: string;
    updatedAt: number;
    class: GuildWorkloadClass;
    avgFluxPerSec: number;
    avgMessagePerSec: number;
    avgLayoutPerSec: number;
    avgP95Ms: number;
    peakRamMb: number;
    samples: number;
}

type ProfileMap = Record<string, GuildProfile>;

async function loadMap(): Promise<ProfileMap> {
    return (await DataStore.get(STORE_KEY)) ?? {};
}

async function saveMap(map: ProfileMap) {
    await DataStore.set(STORE_KEY, map);
}

function classify(flux: number, msg: number, layout: number, p95: number): GuildWorkloadClass {
    const score = flux * 0.4 + msg * 2 + layout * 1.5 + Math.max(0, p95 - 15) * 0.5;
    if (score < 8) return "light";
    if (score < 22) return "medium";
    if (score < 45) return "heavy";
    return "extreme";
}

export async function updateGuildProfile(guildId: string | null | undefined, sample: PerformanceSample) {
    if (!guildId) return null;
    const map = await loadMap();
    const prev = map[guildId];
    const n = (prev?.samples ?? 0) + 1;
    const blend = (old: number, neu: number) => old + (neu - old) / n;

    const next: GuildProfile = {
        guildId,
        updatedAt: Date.now(),
        avgFluxPerSec: blend(prev?.avgFluxPerSec ?? sample.fluxPerSec, sample.fluxPerSec),
        avgMessagePerSec: blend(prev?.avgMessagePerSec ?? sample.messageCreatePerSec, sample.messageCreatePerSec),
        avgLayoutPerSec: blend(prev?.avgLayoutPerSec ?? sample.layoutDimensionsPerSec, sample.layoutDimensionsPerSec),
        avgP95Ms: blend(prev?.avgP95Ms ?? sample.frameP95Ms, sample.frameP95Ms),
        peakRamMb: Math.max(prev?.peakRamMb ?? 0, sample.ramMb),
        samples: n,
        class: "medium",
    };
    next.class = classify(next.avgFluxPerSec, next.avgMessagePerSec, next.avgLayoutPerSec, next.avgP95Ms);
    map[guildId] = next;
    await saveMap(map);
    return next;
}

export async function getGuildProfile(guildId: string | null | undefined) {
    if (!guildId) return null;
    const map = await loadMap();
    return map[guildId] ?? null;
}

export async function resetGuildProfiles() {
    await DataStore.del(STORE_KEY);
}
