/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState, Forms } from "@webpack/common";

import { getPerformanceHistory } from "./engine/stage4/performanceHistory";

function formatTime(t: number) {
    return new Date(t).toLocaleTimeString();
}

export function PerformanceHistoryPanel() {
    const [points, setPoints] = useState(() => getPerformanceHistory());

    useEffect(() => {
        const id = setInterval(() => setPoints(getPerformanceHistory()), 8000);
        return () => clearInterval(id);
    }, []);

    const recent = points.slice(-48);

    return (
        <section className="vc-quiet-perf-settings-extras">
            <Forms.FormTitle tag="h5">Performance history (local ring buffer)</Forms.FormTitle>
            <Forms.FormText className="vc-quiet-perf-risk-muted">
                Last ~30 minutes at controller cadence (sampled down when idle). Not persisted across restarts.
            </Forms.FormText>
            {!recent.length && (
                <Forms.FormText>No samples yet — enable Auto performance controller or wait for metrics.</Forms.FormText>
            )}
            {recent.length > 0 && (
                <div className="vc-quiet-perf-history-table">
                    <div className="vc-quiet-perf-history-head">
                        <span>Time</span>
                        <span>RAM</span>
                        <span>Heap</span>
                        <span>P95</span>
                        <span>LT/min</span>
                        <span>Mode</span>
                    </div>
                    {recent.slice().reverse().map(p => (
                        <div key={p.t} className="vc-quiet-perf-history-row">
                            <span>{formatTime(p.t)}</span>
                            <span>{p.ramMb}</span>
                            <span>{p.heapMb}</span>
                            <span>{p.p95Ms}</span>
                            <span>{p.longTasksPerMin}</span>
                            <span>{(p.mode ?? "—").replace(/_/g, " ")}</span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
