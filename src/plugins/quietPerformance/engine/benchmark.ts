/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { captureBenchmarkSnapshotV2 } from "./benchmarkSnapshotV2";
import { markBenchmarkSessionStart } from "./benchmarkSession";

export async function captureBenchmarkSnapshot(label = "manual", guildId?: string | null) {
    return captureBenchmarkSnapshotV2(label, guildId);
}

export async function copyBenchmarkToClipboard(guildId?: string | null) {
    markBenchmarkSessionStart("export");
    const data = await captureBenchmarkSnapshotV2("benchmark", guildId);
    const text = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(text);
    return text;
}

export { captureBenchmarkSnapshotV2, markBenchmarkSessionStart };
