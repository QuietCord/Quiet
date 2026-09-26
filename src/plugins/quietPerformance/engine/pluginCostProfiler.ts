/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";

export type PluginCostTier = "low" | "medium" | "high" | "unknown";

export interface PluginCostRow {
    name: string;
    enabled: boolean;
    patchCount: number;
    fluxSubscriptions: number;
    startStage: "eager";
    tier: PluginCostTier;
    notes: string[];
}

export interface PluginCostReport {
    capturedAt: string;
    rows: PluginCostRow[];
    warnings: string[];
}

function tierFor(row: Omit<PluginCostRow, "tier">): PluginCostTier {
    if (row.patchCount >= 8 || row.fluxSubscriptions >= 6) return "high";
    if (row.patchCount >= 3 || row.fluxSubscriptions >= 2) return "medium";
    if (row.patchCount === 0 && row.fluxSubscriptions === 0) return "low";
    return "medium";
}

export function collectPluginCostReport(): PluginCostReport {
    const rows: PluginCostRow[] = [];
    const warnings: string[] = [];
    const plugins = Vencord.Plugins.plugins as Record<string, {
        patches?: unknown[];
        flux?: Record<string, unknown>;
    }>;

    for (const [name, plugin] of Object.entries(plugins)) {
        if (name.startsWith("_")) continue;
        const patchCount = plugin.patches?.length ?? 0;
        const fluxSubscriptions = plugin.flux ? Object.keys(plugin.flux).length : 0;
        const base = {
            name,
            enabled: isPluginEnabled(name),
            patchCount,
            fluxSubscriptions,
            startStage: "eager" as const,
            notes: [] as string[],
        };
        const tier = tierFor(base);
        if (tier === "high" && base.enabled) {
            base.notes.push("High patch/Flux surface — may contribute to renderer activity.");
        }
        rows.push({ ...base, tier });
    }

    rows.sort((a, b) => (b.patchCount + b.fluxSubscriptions) - (a.patchCount + a.fluxSubscriptions));

    for (const r of rows.filter(r => r.enabled && r.tier === "high").slice(0, 3)) {
        warnings.push(`Plugin "${r.name}" appears to contribute to high renderer activity (${r.patchCount} patches, ${r.fluxSubscriptions} Flux handlers).`);
    }

    return { capturedAt: new Date().toISOString(), rows, warnings };
}
