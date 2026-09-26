/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, useEffect, useState } from "@webpack/common";

import { formatMetricsLine, readMetricsSnapshot } from "./metricsClient";
import { getMetricsSamplerMs } from "./engine/stage4/adaptiveSampling";
import { bumpResourceBudget } from "./engine/resourceBudget";
import { settings } from "./settings";

function ProfilerPanelLazy() {
    const [Panel, setPanel] = useState<React.ComponentType | null>(null);
    useEffect(() => {
        void import("./profiler/ProfilerPanel").then(m => setPanel(() => m.ProfilerPanel));
    }, []);
    if (!Panel) return null;
    return <Panel />;
}

export function UsageOverlay() {
    const [line, setLine] = useState("…");

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const tick = async () => {
            try {
                bumpResourceBudget("samplerCallbacks", 1);
                const snap = await readMetricsSnapshot(false);
                if (cancelled) return;
                setLine(formatMetricsLine(snap));
            } catch {
                if (!cancelled) setLine("usage n/a");
            }
            if (!cancelled) timer = setTimeout(tick, getMetricsSamplerMs());
        };
        void tick();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, []);

    return (
        <>
            <div
                className="vc-quiet-perf-usage-pill"
                title="Quiet Performance — cached process metrics (single main-process sampler)"
            >
                {line}
            </div>
            {settings.store.enableProfiler && <ProfilerPanelLazy />}
        </>
    );
}
