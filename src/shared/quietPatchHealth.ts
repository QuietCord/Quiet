/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type PatchHealthStatus = "pending" | "applied" | "no_effect" | "error" | "skipped";

export interface PatchHealthRecord {
    patchId: string;
    plugin: string;
    status: PatchHealthStatus;
    moduleId?: string;
    match?: string;
    error?: string;
    skipReason?: string;
}

const records = new Map<string, PatchHealthRecord>();

export function expectPatch(patchId: string, plugin: string) {
    records.set(patchId, { patchId, plugin, status: "pending" });
}

export function markPatchApplied(patchId: string, moduleId: PropertyKey) {
    const row = records.get(patchId);
    if (!row) return;
    row.status = "applied";
    row.moduleId = String(moduleId);
}

export function markPatchNoEffect(patchId: string, moduleId: PropertyKey, match: PatchReplacementMatch) {
    const row = records.get(patchId);
    if (!row || row.status === "applied") return;
    row.status = "no_effect";
    row.moduleId = String(moduleId);
    row.match = String(match);
}

export function markPatchSkipped(patchId: string, reason: string) {
    const row = records.get(patchId);
    if (!row) return;
    row.status = "skipped";
    row.skipReason = reason;
}

export function markPatchError(patchId: string, moduleId: PropertyKey, match: PatchReplacementMatch, error: unknown) {
    const row = records.get(patchId);
    if (!row) return;
    row.status = "error";
    row.moduleId = String(moduleId);
    row.match = String(match);
    row.error = error instanceof Error ? error.message : String(error);
}

type PatchReplacementMatch = string | RegExp;

export function getPatchHealthForPlugin(plugin: string) {
    return [...records.values()].filter(r => r.plugin === plugin);
}

export function getBrokenPatches(plugin: string) {
    return getPatchHealthForPlugin(plugin).filter(r =>
        r.status === "no_effect" || r.status === "error" || r.status === "pending",
    );
}

export function summarizePatchHealth(plugin: string) {
    const rows = getPatchHealthForPlugin(plugin);
    const active = rows.filter(r => r.status !== "skipped");
    const applied = active.filter(r => r.status === "applied");
    const broken = getBrokenPatches(plugin);
    const skipped = rows.filter(r => r.status === "skipped");
    return { rows, active, applied, broken, skipped };
}
