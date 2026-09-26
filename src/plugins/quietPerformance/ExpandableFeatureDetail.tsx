/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useState, Forms } from "@webpack/common";

import { FEATURE_META, riskLabel, type FeatureMeta } from "./engine/riskMeta";
import { getFeatureTriState, resolveFeatureEnabled } from "./engine/stage4/featureControl";
import { getPerformanceControllerState } from "./engine/stage4/performanceController";
import type { AutoFeatureKey } from "./engine/stage4/types";
import { settings } from "./settings";

const AUTO_KEYS = new Set<string>([
    "channelLayoutCoalesce",
    "batchTypingUpdates",
    "memoryPressureController",
    "mediaVisibleOnly",
]);

function effectiveStatus(metaKey: string): string | null {
    if (!AUTO_KEYS.has(metaKey)) return null;
    const tri = getFeatureTriState(metaKey as AutoFeatureKey);
    const state = getPerformanceControllerState();
    const on = resolveFeatureEnabled(metaKey as AutoFeatureKey, state);
    if (tri === "on") return "ON (forced)";
    if (tri === "off") return "OFF (forced)";
    if (!settings.store.autoPerformanceController) return on ? "ON (legacy toggle)" : "OFF (legacy toggle)";
    return on ? `AUTO — active (${state?.mode ?? "normal"})` : "AUTO — inactive";
}

function autoReason(metaKey: string): string | null {
    if (!AUTO_KEYS.has(metaKey) || !settings.store.autoPerformanceController) return null;
    const tri = getFeatureTriState(metaKey as AutoFeatureKey);
    if (tri !== "auto") return null;
    const state = getPerformanceControllerState();
    if (!state || !resolveFeatureEnabled(metaKey as AutoFeatureKey, state)) return null;
    return state.reasons.slice(0, 3).join(" · ") || "Rolling metrics";
}

export function ExpandableFeatureDetail({ metaKey }: { metaKey: string; }) {
    const meta = FEATURE_META[metaKey];
    const [open, setOpen] = useState(false);
    if (!meta) return null;

    return (
        <div className="vc-quiet-perf-expand">
            <button type="button" className="vc-quiet-perf-expand-toggle" onClick={() => setOpen(v => !v)}>
                {meta.title} — {riskLabel(meta.risk)} {open ? "▾" : "▸"}
            </button>
            {open && <FeatureDetailBody meta={meta} />}
        </div>
    );
}

function FeatureDetailBody({ meta }: { meta: FeatureMeta; }) {
    return (
        <div className="vc-quiet-perf-expand-body">
            <DetailRow label="What it does" value={meta.whatItDoes} />
            {meta.disables && <DetailRow label="What it disables" value={meta.disables} />}
            {meta.sideEffects && <DetailRow label="Possible side effects" value={meta.sideEffects} />}
            <DetailRow label="Performance benefit" value={meta.benefit} />
            <DetailRow label="Risk" value={riskLabel(meta.risk)} />
            <DetailRow label="Stage" value={String(meta.stage)} />
            <DetailRow label="Requires restart" value={meta.restart ? "Yes" : "No"} />
            {effectiveStatus(meta.id) && <DetailRow label="Effective" value={effectiveStatus(meta.id)!} />}
            {autoReason(meta.id) && <DetailRow label="AUTO reason" value={autoReason(meta.id)!} />}
            {AUTO_KEYS.has(meta.id) && (
                <DetailRow label="Override" value={`${getFeatureTriState(meta.id as AutoFeatureKey).toUpperCase()} (see Stage 4 settings)`} />
            )}
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string; }) {
    return (
        <Forms.FormText className="vc-quiet-perf-detail-row">
            <strong>{label}:</strong> {value}
        </Forms.FormText>
    );
}
