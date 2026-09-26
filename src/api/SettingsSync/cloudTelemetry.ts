/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { summarizePatchHealth } from "@shared/quietPatchHealth";
import { Logger } from "@utils/Logger";
import { getBuildNumber } from "@webpack/patcher";
import gitHash from "~git-hash";

import { checkCloudUrlCsp, getCloudAuth, getCloudUrl } from "./cloudSetup";

const logger = new Logger("SettingsSync:Telemetry", "#39b7e0");

export interface AnonymousPerfTelemetryV1 {
    schema: 1;
    discordBuild: number;
    quietGitHash: string;
    buildChannel: "desktop" | "web" | "ptb-dev";
    guildClass: string | null;
    patchHealth: {
        applied: number;
        active: number;
        brokenCount: number;
        brokenIds: string[];
        skipped: number;
    };
    metrics: {
        ramMb: number;
        fps: number;
        frameP95Ms: number;
        fluxPerSec: number;
        longTasksPerMin: number;
    };
    preset: string;
    safeMode: boolean;
    benchmarkMode: boolean;
}

export function buildAnonymousPerfTelemetry(input: {
    guildClass: string | null;
    metrics: AnonymousPerfTelemetryV1["metrics"];
    preset: string;
    safeMode: boolean;
    benchmarkMode: boolean;
}): AnonymousPerfTelemetryV1 {
    const { applied, active, broken, skipped } = summarizePatchHealth("QuietPerformance");

    return {
        schema: 1,
        discordBuild: getBuildNumber(),
        quietGitHash: gitHash,
        buildChannel: IS_DEV ? "ptb-dev" : IS_WEB ? "web" : "desktop",
        guildClass: input.guildClass,
        patchHealth: {
            applied: applied.length,
            active: active.length,
            brokenCount: broken.length,
            brokenIds: broken.map(r => r.patchId).slice(0, 32),
            skipped: skipped.length,
        },
        metrics: input.metrics,
        preset: input.preset,
        safeMode: input.safeMode,
        benchmarkMode: input.benchmarkMode,
    };
}

export async function postAnonymousPerfTelemetry(body: AnonymousPerfTelemetryV1) {
    if (!await checkCloudUrlCsp()) return false;

    try {
        const res = await fetch(new URL("/v1/telemetry/perf", getCloudUrl()), {
            method: "POST",
            headers: {
                Authorization: await getCloudAuth(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            logger.warn(`Perf telemetry rejected (${res.status})`);
            return false;
        }

        const data = await res.json() as { accepted?: boolean; };
        return data.accepted !== false;
    } catch (e) {
        logger.warn("Perf telemetry failed", e);
        return false;
    }
}
