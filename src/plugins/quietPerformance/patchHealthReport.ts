/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getBrokenPatches, getPatchHealthForPlugin } from "@shared/quietPatchHealth";
import { Logger } from "@utils/Logger";
import { getBuildNumber } from "@webpack/patcher";

import { settings } from "./settings";

const logger = new Logger("QuietPerformance/Patches");

export function logPatchHealth(plugin = "QuietPerformance") {
    const discordBuild = getBuildNumber();
    const rows = getPatchHealthForPlugin(plugin);
    const broken = getBrokenPatches(plugin);

    logger.info("patch health", {
        discordBuild,
        applied: rows.filter(r => r.status === "applied").length,
        total: rows.length,
        broken: broken.map(r => ({ id: r.patchId, status: r.status, moduleId: r.moduleId })),
    });

    if ((IS_DEV || settings.store.patchDiagnostics) && broken.length) {
        logger.warn(`${broken.length} QuietPerformance patch(es) failed after Discord update`, broken);
    }

    return { discordBuild, rows, broken };
}
