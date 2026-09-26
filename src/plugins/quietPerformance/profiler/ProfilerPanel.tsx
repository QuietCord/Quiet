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

    return (
        <div className="vc-quiet-profiler-panel">
            <div className="vc-quiet-profiler-title">Quiet Profiler</div>
            <Row label="RAM" value={pm ? `${pm.ramMb} MB` : "—"} />
            <Row label="JS heap" value={`${snap.jsHeapUsedMb}/${snap.jsHeapTotalMb} MB`} />
            <Row label="CPU total" value={pm ? `${pm.cpu}%` : "—"} />
            <Row label="CPU renderer" value={pm ? `${pm.buckets.renderer.cpu}%` : "—"} />
            <Row label="CPU GPU" value={pm ? `${pm.buckets.gpu.cpu}%` : "—"} />
            <Row label="FPS" value={snap.fps} />
            <Row label="Frame P95" value={`${snap.frameP95Ms} ms`} />
            <Row label="Long tasks/min" value={snap.longTasksPerMin} />
            <Row label="Flux/s" value={snap.fluxEventsPerSec} />
            {snap.topFluxEvents[0] && (
                <Row label="Top Flux" value={`${snap.topFluxEvents[0].type} (${snap.topFluxEvents[0].count})`} />
            )}
        </div>
    );
}
