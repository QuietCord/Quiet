/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { summarizePatchHealth } from "@shared/quietPatchHealth";
import { Logger } from "@utils/Logger";
import { getBuildNumber } from "@webpack/patcher";

import { recordOptimizationError } from "./engine/optimizationSafety";
import { settings } from "./settings";

const logger = new Logger("QuietPerformance/Patches");

const PATCH_LABELS: Record<string, string> = {
    "perf-truncateTop": "MessageStore cap",
    "perf-autoPlayGif": "GIF autoplay",
    "perf-stripMedia": "Strip embeds/media",
    "perf-freeze-canAnimate": "Freeze canAnimate",
    "perf-freeze-emoji": "Freeze status emoji",
    "perf-freeze-banner": "Freeze guild banner",
    "perf-freeze-gradient": "Freeze gradient roles",
    "perf-freeze-nameplate": "Freeze nameplates",
};

function label(patchId: string) {
    return PATCH_LABELS[patchId] ?? patchId;
}

export function formatPatchHealthToast(plugin = "QuietPerformance") {
    const discordBuild = getBuildNumber();
    const { active, applied, broken, skipped } = summarizePatchHealth(plugin);
    const head = `${applied.length}/${active.length} active patches OK (Discord ${discordBuild})`;
    if (broken.length === 0 && skipped.length === 0) return head;

    const parts = [head];
    if (skipped.length)
        parts.push(`skipped: ${skipped.map(r => label(r.patchId)).join(", ")}`);
    if (broken.length)
        parts.push(`not OK: ${broken.map(r => `${label(r.patchId)} (${r.status})`).join(", ")}`);
    return parts.join(" · ");
}

export function logPatchHealth(plugin = "QuietPerformance") {
    const discordBuild = getBuildNumber();
    const summary = summarizePatchHealth(plugin);
    const { rows, applied, broken, skipped, active } = summary;

    logger.info("patch health", {
        discordBuild,
        applied: applied.length,
        active: active.length,
        registered: rows.length,
        skipped: skipped.map(r => ({ id: r.patchId, reason: r.skipReason })),
        broken: broken.map(r => ({ id: r.patchId, status: r.status, moduleId: r.moduleId, error: r.error })),
    });

    if ((IS_DEV || settings.store.patchDiagnostics) && broken.length) {
        logger.warn(`${broken.length} QuietPerformance patch(es) need attention (build ${discordBuild})`, broken);
        for (const row of broken) {
            recordOptimizationError(`patch:${row.patchId}`, row.error ?? row.status);
        }
    }

    return { discordBuild, rows, broken, skipped, applied, active, toast: formatPatchHealthToast(plugin) };
}
