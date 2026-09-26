/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from "@webpack/common";

import { getProfilerSnapshot, type ProfilerSnapshot } from "./collector";

function Row({ label, value }: { label: string; value: string | number; }) {
    return (
        <div className="vc-quiet-profiler-row">
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}

export function ProfilerPanel() {
    const [snap, setSnap] = useState<ProfilerSnapshot | null>(null);

    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            const next = await getProfilerSnapshot();
            if (!cancelled) setSnap(next);
        };
        void tick();
        const id = setInterval(tick, 5000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    if (!snap?.enabled) return null;

    const pm = snap.processMetrics;
    const lt = snap.lastLongTask;

    return (
        <div className="vc-quiet-profiler-panel">
            <div className="vc-quiet-profiler-title">Quiet Profiler</div>
            <Row label="RAM" value={pm ? `${snap.ramMb} MB (peak ${snap.ramPeakMb})` : "—"} />
            <Row label="RAM recovery" value={`${snap.ramRecoveryPct}%`} />
            <Row label="JS heap" value={`${snap.jsHeapUsedMb}/${snap.jsHeapTotalMb} MB`} />
            <Row label="Heap peak / Δ" value={`${snap.jsHeapPeakMb} / +${snap.jsHeapDeltaMb}`} />
            <Row label="Heap recovery" value={`${snap.jsHeapRecoveryPct}%`} />
            <Row label="CPU total" value={pm ? `${pm.cpu}%` : "—"} />
            <Row label="FPS" value={snap.fps} />
            <Row label="Frame P50/P95/P99" value={`${snap.frameP50Ms} / ${snap.frameP95Ms} / ${snap.frameP99Ms} ms`} />
            <Row label="Long tasks/min" value={snap.longTasksPerMin} />
            <Row label="Flux/s" value={snap.fluxEventsPerSec} />
            {snap.topFluxEvents[0] && (
                <Row label="Top Flux" value={`${snap.topFluxEvents[0].type} (${snap.topFluxEvents[0].count})`} />
            )}
            {lt && (
                <Row label="Last long task" value={`${lt.durationMs}ms · ${lt.fluxLast100ms[0]?.type ?? "?"}×${lt.fluxLast100ms[0]?.count ?? 0}`} />
            )}
        </div>
    );
}
