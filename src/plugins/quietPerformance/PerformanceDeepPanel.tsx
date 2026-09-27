/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Forms } from "@webpack/common";
import { useEffect, useState } from "@webpack/common";

import {
    captureQuietSelfProfile,
    getFluxAttribution,
    getLoafSamples,
    getWebpackModuleStats,
    getWebpackSearchStats,
    isDeepProfilerActive,
    resetDeepProfilerSamples,
    syncDeepProfiler,
} from "./engine/stage5";
import { logPatchHealth } from "./patchHealthReport";
import { settings } from "./settings";

export function PerformanceDeepPanel() {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        syncDeepProfiler();
    }, [settings.store.deepProfiler]);

    useEffect(() => {
        if (!settings.store.deepProfiler) return;
        const id = setInterval(() => setTick(t => t + 1), 3000);
        return () => clearInterval(id);
    }, [settings.store.deepProfiler]);

    void tick;

    const active = isDeepProfilerActive();
    const modules = getWebpackModuleStats(5);
    const searches = getWebpackSearchStats(4);
    const flux = getFluxAttribution(5);
    const loaf = getLoafSamples(2);

    return (
        <section className="vc-quiet-perf-settings-extras">
            <Forms.FormTitle tag="h5">Stage 5 — Deep attribution</Forms.FormTitle>
            <Forms.FormText className="vc-quiet-perf-risk-muted">
                Optional webpack module timing, search cost, Flux→store hints, and LoAF samples. Higher overhead than the light profiler — use on PTB while tuning, then turn off.
            </Forms.FormText>

            {!settings.store.deepProfiler && (
                <Forms.FormText className="vc-quiet-perf-risk-warn">
                    Enable &quot;Deep profiler&quot; below to collect attribution data.
                </Forms.FormText>
            )}

            {active && (
                <>
                    <Forms.FormTitle tag="h5" className="vc-quiet-perf-section-gap">Top webpack factories (total ms)</Forms.FormTitle>
                    {modules.length === 0
                        ? <Forms.FormText className="vc-quiet-perf-risk-muted">No modules timed yet — browse Discord for a minute.</Forms.FormText>
                        : modules.map(m => (
                            <Forms.FormText key={m.moduleId} className="vc-quiet-perf-risk-muted">
                                {m.moduleId}: {m.totalMs} ms ({m.executions}×, {m.phase})
                            </Forms.FormText>
                        ))}

                    <Forms.FormTitle tag="h5" className="vc-quiet-perf-section-gap">Webpack search cost</Forms.FormTitle>
                    {searches.length === 0
                        ? <Forms.FormText className="vc-quiet-perf-risk-muted">No timed findByCode/findByProps yet.</Forms.FormText>
                        : searches.map(s => (
                            <Forms.FormText key={s.method} className="vc-quiet-perf-risk-muted">
                                {s.method}: {s.calls} calls, {s.totalMs} ms total (max {s.maxMs} ms)
                            </Forms.FormText>
                        ))}

                    <Forms.FormTitle tag="h5" className="vc-quiet-perf-section-gap">Flux fanout (heuristic)</Forms.FormTitle>
                    {flux.map(row => (
                        <Forms.FormText key={row.type} className="vc-quiet-perf-risk-muted">
                            {row.type} ×{row.count} → {row.stores.join(", ")} → {row.ui.join(", ")}
                        </Forms.FormText>
                    ))}

                    {loaf.length > 0 && (
                        <>
                            <Forms.FormTitle tag="h5" className="vc-quiet-perf-section-gap">Long animation frames</Forms.FormTitle>
                            {loaf.map((s, i) => (
                                <Forms.FormText key={i} className="vc-quiet-perf-risk-muted">
                                    {s.durationMs} ms (blocking {s.blockingMs} ms) · Flux: {s.fluxWindow.map(f => `${f.type}×${f.count}`).join(", ") || "—"}
                                </Forms.FormText>
                            ))}
                        </>
                    )}
                </>
            )}

            <div className="vc-quiet-perf-recovery-row">
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.PRIMARY}
                    onClick={() => {
                        logPatchHealth();
                        void navigator.clipboard.writeText(JSON.stringify(captureQuietSelfProfile(), null, 2));
                    }}
                >
                    Copy self-profile JSON
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.BRAND}
                    onClick={() => {
                        resetDeepProfilerSamples();
                        setTick(t => t + 1);
                    }}
                >
                    Reset samples
                </Button>
            </div>
            <Forms.FormText className="vc-quiet-perf-risk-muted">
                Patch health summary — use <strong>QuietRecovery</strong> panel above for Safe Mode and re-baseline actions.
            </Forms.FormText>
        </section>
    );
}
