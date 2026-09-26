/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type RiskLevel = "safe" | "caution" | "risky" | "experimental";

export interface FeatureMeta {
    id: string;
    title: string;
    risk: RiskLevel;
    stage: 1 | 2 | 3;
    restart?: boolean;
    whatItDoes: string;
    disables?: string;
    sideEffects?: string;
    benefit: string;
}

export const FEATURE_META: Record<string, FeatureMeta> = {
    adaptiveBackground: {
        id: "adaptiveBackground",
        title: "Adaptive background mode",
        risk: "safe",
        stage: 3,
        whatItDoes: "When Discord is unfocused, hidden, or minimized, pauses motion/GIF autoplay and reduces visual work. Voice and messages are untouched.",
        benefit: "Lower idle CPU when Discord is in the tray or behind other windows.",
    },
    memoryPressureController: {
        id: "memoryPressureController",
        title: "Adaptive memory pressure",
        risk: "experimental",
        stage: 3,
        whatItDoes: "Tiered RAM response (~850/950/1100 MB default) with hysteresis: elevated → pressure → high. Incremental inactive cache trim and off-screen media pressure.",
        disables: "Does not block messages, voice, or notifications.",
        sideEffects: "Older history or media may reload after cleanup.",
        benefit: "Helps RAM recover after peaks without hard caps.",
    },
    batchPresenceUpdates: {
        id: "batchPresenceUpdates",
        title: "Batch presence updates",
        risk: "experimental",
        stage: 3,
        whatItDoes: "Groups PRESENCE_UPDATE / GUILD_MEMBER_UPDATE into short windows before dispatch continues.",
        sideEffects: "Online/idle badges and activities may update up to ~32ms later.",
        benefit: "Fewer render cascades when presence churn is high.",
    },
    channelLayoutCoalesce: {
        id: "channelLayoutCoalesce",
        title: "Coalesce channel list layout",
        risk: "caution",
        stage: 3,
        whatItDoes: "Defers channel list dimension dispatches to one animation frame (keeps every list update, does not merge into one global payload). Row dimensions coalesce per channelId. Flushes before MESSAGE_CREATE / channel switch.",
        sideEffects: "Rare sidebar glitches if Discord changes dimension payloads; sending a message forces flush if stuck.",
        benefit: "Targets load spikes from dimension storms in large servers (lower P95/long tasks).",
    },
    batchTypingUpdates: {
        id: "batchTypingUpdates",
        title: "Typing visual batch",
        risk: "experimental",
        stage: 3,
        whatItDoes: "Groups TYPING_START/STOP visual dispatches to one requestAnimationFrame batch.",
        sideEffects: "Typing dots may lag ~1 frame.",
        benefit: "Fewer typing indicator rerenders in busy channels.",
    },
    mediaVisibleOnly: {
        id: "mediaVisibleOnly",
        title: "Visible-only media",
        risk: "experimental",
        stage: 3,
        whatItDoes: "Pauses off-screen videos and defers GIF paint until near the viewport.",
        sideEffects: "Media may pop in when scrolling; background mode still pauses playback.",
        benefit: "Less decode/CPU for off-screen chat media.",
    },
    reactMemoHotPath: {
        id: "reactMemoHotPath",
        title: "React memo hot paths",
        risk: "experimental",
        stage: 3,
        whatItDoes: "Wraps Message/Avatar exports with React.memo and shallow prop compares when sub-toggles are on.",
        sideEffects: "Stale UI if compare misses a prop Discord expects (plugins, edits, reactions).",
        benefit: "Skips redundant Message/Avatar renders when props are unchanged.",
    },
    lifecycleDebug: {
        id: "lifecycleDebug",
        title: "Lifecycle debug counters",
        risk: "experimental",
        stage: 3,
        whatItDoes: "Counts active timers created via patched setTimeout/setInterval.",
        sideEffects: "Tiny overhead; dev-oriented.",
        benefit: "Spot runaway timers in profiler export.",
    },
    messageCacheV2: {
        id: "messageCacheV2",
        title: "Tiered message cache (LRU)",
        risk: "caution",
        stage: 3,
        whatItDoes: "Active channel keeps a higher cap; recently visited channels medium; abandoned channels low.",
        sideEffects: "Switching back to old channels may re-fetch history.",
        benefit: "Less MessageStore RAM across many visited channels.",
    },
    stripAttachments: {
        id: "stripAttachments",
        title: "Strip attachments (React)",
        risk: "risky",
        stage: 1,
        whatItDoes: "Skips rendering attachment UI in chat.",
        sideEffects: "Images/videos/files in messages will not show.",
        benefit: "Less decode/layout work in media-heavy channels.",
    },
    cdnPolicy: {
        id: "cdnPolicy",
        title: "CDN media policy",
        risk: "risky",
        stage: 1,
        restart: true,
        whatItDoes: "Main-process rules for Efficient (heavy media) or Text Only (all CDN images/media).",
        sideEffects: "Avatars, previews, GIFs, or banners may fail depending on policy.",
        benefit: "Blocks downloads before they enter RAM.",
    },
};

export function riskLabel(risk: RiskLevel) {
    switch (risk) {
        case "safe": return "Safe";
        case "caution": return "Caution";
        case "risky": return "Risky";
        case "experimental": return "Experimental";
    }
}
