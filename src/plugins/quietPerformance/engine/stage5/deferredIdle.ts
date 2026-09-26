/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { trimPerformanceHistory } from "../stage4/performanceHistory";

let scheduled = false;

export function scheduleIdleMaintenance() {
    if (scheduled) return;
    scheduled = true;
    const run = () => {
        scheduled = false;
        try {
            trimPerformanceHistory();
        } catch {
            // ignore
        }
    };
    if (typeof requestIdleCallback === "function") {
        requestIdleCallback(run, { timeout: 5000 });
    } else {
        setTimeout(run, 2000);
    }
}
