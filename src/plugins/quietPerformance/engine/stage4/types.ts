/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type PerformanceMode =
    | "idle"
    | "normal"
    | "busy"
    | "high_load"
    | "memory_pressure"
    | "frame_pressure";

export type FramePressureTier = "none" | "light" | "moderate" | "severe";

export type GuildWorkloadClass = "light" | "medium" | "heavy" | "extreme";

export type FeatureTriState = "auto" | "on" | "off";

export type AutoFeatureKey =
    | "channelLayoutCoalesce"
    | "batchTypingUpdates"
    | "mediaVisibleOnly"
    | "memoryPressureController";

export interface PerformanceSample {
    at: number;
    ramMb: number;
    rendererRamMb: number;
    jsHeapMb: number;
    fps: number;
    frameP95Ms: number;
    frameP99Ms: number;
    longTasksPerMin: number;
    fluxPerSec: number;
    messageCreatePerSec: number;
    typingPerSec: number;
    voicePerSec: number;
    layoutDimensionsPerSec: number;
}

export interface PerformanceControllerState {
    mode: PerformanceMode;
    framePressure: FramePressureTier;
    guildClass: GuildWorkloadClass | null;
    sample: PerformanceSample | null;
    reasons: string[];
    activePolicies: string[];
    pendingMode: PerformanceMode | null;
    pendingSamples: number;
}

export interface PerformanceHistoryPoint {
    t: number;
    ramMb: number;
    heapMb: number;
    p95Ms: number;
    longTasksPerMin: number;
    mode?: PerformanceMode;
    framePressure?: FramePressureTier;
}
