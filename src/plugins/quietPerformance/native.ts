/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app, session } from "electron";

export interface ProcessUsage {
    type: string;
    pid: number;
    cpu: number;
    ramMb: number;
}

export interface AppUsage {
    ramMb: number;
    cpu: number;
    processes: ProcessUsage[];
}

/** Working set is kilobytes. CPU is percent of one core, summed across processes. */
export async function getUsage(): Promise<AppUsage> {
    const metrics = app.getAppMetrics();
    let workingSetKb = 0;
    let cpu = 0;
    const processes = metrics.map(metric => {
        workingSetKb += metric.memory.workingSetSize;
        cpu += metric.cpu.percentCPUUsage;
        return {
            type: metric.type,
            pid: metric.pid,
            cpu: Math.round(metric.cpu.percentCPUUsage * 10) / 10,
            ramMb: Math.round(metric.memory.workingSetSize / 1024),
        };
    });

    return {
        ramMb: Math.round(workingSetKb / 1024),
        cpu: Math.round(cpu * 10) / 10,
        processes,
    };
}

export async function clearRendererCache() {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearCodeCaches({});
}
