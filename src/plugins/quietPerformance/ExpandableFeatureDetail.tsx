/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useState, Forms } from "@webpack/common";

import { FEATURE_META, riskLabel, type FeatureMeta } from "./engine/riskMeta";

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
