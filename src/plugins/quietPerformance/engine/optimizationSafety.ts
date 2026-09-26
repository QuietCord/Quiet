/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { getBuildNumber } from "@webpack/patcher";

import * as DataStore from "@api/DataStore";

import { settings } from "../settings";

const logger = new Logger("QuietPerformance/Safety");

const ERROR_THRESHOLD = 3;
const STORE_KEY = "QuietPerformance_crashAttribution";

const errors = new Map<string, number>();
const autoDisabled = new Set<string>();

const SETTING_BY_OPT: Record<string, keyof typeof settings.store> = {
    reactMemoHotPath: "reactMemoHotPath",
    reactMemoMessage: "reactMemoMessage",
    reactMemoAvatar: "reactMemoAvatar",
    channelLayoutCoalesce: "channelLayoutCoalesce",
    batchPresenceUpdates: "batchPresenceUpdates",
    batchTypingUpdates: "batchTypingUpdates",
    memoryPressureController: "memoryPressureController",
    mediaVisibleOnly: "mediaVisibleOnly",
};

const MODE_BY_OPT: Partial<Record<string, keyof typeof settings.store>> = {
    channelLayoutCoalesce: "channelLayoutCoalesceMode",
    batchTypingUpdates: "batchTypingUpdatesMode",
    memoryPressureController: "memoryPressureControllerMode",
    mediaVisibleOnly: "mediaVisibleOnlyMode",
};

export interface CrashAttributionEntry {
    at: string;
    feature: string;
    discordBuild: number;
    count: number;
    message: string;
    autoDisabled: boolean;
}

async function appendAttribution(entry: CrashAttributionEntry) {
    const prev = (await DataStore.get<CrashAttributionEntry[]>(STORE_KEY)) ?? [];
    prev.push(entry);
    while (prev.length > 40) prev.shift();
    await DataStore.set(STORE_KEY, prev);
}

export async function getCrashAttributionLog() {
    return (await DataStore.get<CrashAttributionEntry[]>(STORE_KEY)) ?? [];
}

function disableFeature(optId: string) {
    const modeKey = MODE_BY_OPT[optId];
    if (modeKey) {
        (settings.store as Record<string, unknown>)[modeKey as string] = "off";
        return;
    }
    const key = SETTING_BY_OPT[optId];
    if (key) (settings.store as Record<string, unknown>)[key as string] = false;
}

export function recordOptimizationError(optId: string, error: unknown) {
    if (!settings.store.autoDisableExperimental) return;
    const count = (errors.get(optId) ?? 0) + 1;
    errors.set(optId, count);
    logger.warn(`${optId} error (${count}/${ERROR_THRESHOLD})`, error);

    if (count < ERROR_THRESHOLD || autoDisabled.has(optId)) return;

    disableFeature(optId);
    autoDisabled.add(optId);
    logger.error(`Auto-disabled ${optId} after repeated errors`);

    const message = error instanceof Error ? error.message : String(error);
    void appendAttribution({
        at: new Date().toISOString(),
        feature: optId,
        discordBuild: getBuildNumber(),
        count,
        message: message.slice(0, 240),
        autoDisabled: true,
    });

    (Vencord.Plugins.plugins.QuietPerformance as { syncAdaptiveEngine?: () => void; syncAdaptiveEngineFromController?: () => void; })?.syncAdaptiveEngine?.();
}

export function getAutoDisabledOptimizations() {
    return [...autoDisabled];
}

export function clearAutoDisableFlags() {
    autoDisabled.clear();
    errors.clear();
}
