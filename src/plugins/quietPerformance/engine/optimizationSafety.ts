/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

import { settings } from "../settings";

const logger = new Logger("QuietPerformance/Safety");

const ERROR_THRESHOLD = 3;
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

export function recordOptimizationError(optId: string, error: unknown) {
    if (!settings.store.autoDisableExperimental) return;
    const count = (errors.get(optId) ?? 0) + 1;
    errors.set(optId, count);
    logger.warn(`${optId} error (${count}/${ERROR_THRESHOLD})`, error);

    if (count < ERROR_THRESHOLD || autoDisabled.has(optId)) return;

    const key = SETTING_BY_OPT[optId];
    if (key && settings.store[key]) {
        (settings.store as Record<string, unknown>)[key as string] = false;
        autoDisabled.add(optId);
        logger.error(`Auto-disabled ${key} after repeated errors`);
    }
}

export function getAutoDisabledOptimizations() {
    return [...autoDisabled];
}

export function clearAutoDisableFlags() {
    autoDisabled.clear();
    errors.clear();
}
