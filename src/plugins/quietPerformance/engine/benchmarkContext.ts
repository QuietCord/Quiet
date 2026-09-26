/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Local one-way hash for comparing runs without storing raw guild ids in exports. */
export async function anonymizeGuildId(guildId: string | null | undefined): Promise<string | null> {
    if (!guildId) return null;
    try {
        const data = new TextEncoder().encode(`quiet-perf:${guildId}`);
        const digest = await crypto.subtle.digest("SHA-256", data);
        const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
        return hex.slice(0, 12);
    } catch {
        return null;
    }
}

export function getHardwareContext() {
    const screen = window.screen;
    const refresh = screen && "refreshRate" in screen ? Number((screen as Screen & { refreshRate?: number; }).refreshRate) : 0;
    return {
        logicalCpus: navigator.hardwareConcurrency ?? null,
        deviceMemoryGb: (navigator as Navigator & { deviceMemory?: number; }).deviceMemory ?? null,
        platform: navigator.platform,
        gpuAccelerationDisabled: document.documentElement.classList.contains("vc-quiet-perf-no-gpu") || false,
        disableGpuSetting: false as boolean,
        displayRefreshHz: refresh > 0 ? refresh : null,
    };
}
