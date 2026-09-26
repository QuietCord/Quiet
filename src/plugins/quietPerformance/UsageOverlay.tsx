/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/lazyReact";
import { useEffect, useState } from "@webpack/common";

import { formatMetricsLine, readMetricsSnapshot, SAMPLER_MS } from "./metricsClient";
import { settings } from "./settings";

const ProfilerPanel = LazyComponent(() =>
    import("./profiler/ProfilerPanel").then(m => ({ default: m.ProfilerPanel })),
);

export function UsageOverlay() {
    const [line, setLine] = useState("…");

    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            try {
                const snap = await readMetricsSnapshot(false);
                if (cancelled) return;
                setLine(formatMetricsLine(snap));
            } catch {
                if (!cancelled) setLine("usage n/a");
            }
        };
        void tick();
        const id = setInterval(tick, SAMPLER_MS);
        return () => {
            cancelled = true;
            clearInterval(id);
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
            {settings.store.enableProfiler && <ProfilerPanel />}
        </>
    );
}
