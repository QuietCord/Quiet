/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PluginNative } from "@utils/types";
import { useEffect, useState } from "@webpack/common";

export function UsageOverlay() {
    const [line, setLine] = useState("…");

    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            try {
                const Native = VencordNative.pluginHelpers.QuietPerformance as PluginNative<typeof import("./native")>;
                const u = await Native.getUsage();
                if (cancelled) return;
                const top = [...u.processes].sort((a, b) => b.ramMb - a.ramMb)[0];
                setLine(`${u.ramMb} MB · ${u.cpu}% · ${u.processes.length} proc` +
                    (top ? ` · ${top.type} ${top.ramMb}` : ""));
            } catch {
                if (!cancelled) setLine("usage n/a");
            }
        };
        void tick();
        const id = setInterval(tick, 5000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    return (
        <div
            className="vc-quiet-perf-usage-pill"
            title="Quiet Performance — total Discord process RAM (working set) and CPU"
        >
            {line}
        </div>
    );
}
