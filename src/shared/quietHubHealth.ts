/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { summarizePatchHealth, type PatchHealthRecord } from "@shared/quietPatchHealth";

/** Plugins whose webpack patch health is surfaced in Quiet Hub. */
export const QUIET_HUB_PATCH_PLUGINS = ["QuietPerformance", "QuietHomeBrand"] as const;

export function getQuietHubBrokenPatches(): PatchHealthRecord[] {
    const out: PatchHealthRecord[] = [];
    for (const plugin of QUIET_HUB_PATCH_PLUGINS) {
        const { broken } = summarizePatchHealth(plugin);
        for (const row of broken) {
            if (row.patchId === "home-brand-dom-overlay" && row.status === "pending") continue;
            out.push(row);
        }
    }
    return out;
}

export function countQuietHubWebpackPatches() {
    let active = 0;
    let applied = 0;
    for (const plugin of QUIET_HUB_PATCH_PLUGINS) {
        const { active: rows, applied: ok } = summarizePatchHealth(plugin);
        for (const row of rows) {
            if (row.patchId === "home-brand-dom-overlay") continue;
            active++;
        }
        applied += ok.filter(r => r.patchId !== "home-brand-dom-overlay").length;
    }
    return { active, applied };
}

export function formatQuietHubPatchLine() {
    const { active, applied } = countQuietHubWebpackPatches();
    const broken = getQuietHubBrokenPatches();
    if (broken.length === 0) return `${applied}/${active} webpack patches OK`;
    return `${applied}/${active} OK · ${broken.length} need attention`;
}
