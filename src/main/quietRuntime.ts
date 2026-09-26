/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app, BrowserWindowConstructorOptions, session } from "electron";

import { startMetricsSampler } from "./metricsSampler";
import { RendererSettings } from "./settings";

export type CdnPolicy = "normal" | "efficient" | "textOnly";
export type RasterThreads = "auto" | "1" | "2" | "4";

export interface QuietPerformanceConfig {
    enabled: boolean;
    liteChromium: boolean;
    freezeMotion: boolean;
    disableBlur: boolean;
    disableSpellcheck: boolean;
    aggressiveMemory: boolean;
    disableGpu: boolean;
    cdnPolicy: CdnPolicy;
    trimMessageCache: boolean;
    messageCacheCap: number;
    rasterThreads: RasterThreads;
}

const DISABLED: QuietPerformanceConfig = {
    enabled: false,
    liteChromium: false,
    freezeMotion: false,
    disableBlur: false,
    disableSpellcheck: false,
    aggressiveMemory: false,
    disableGpu: false,
    cdnPolicy: "normal",
    trimMessageCache: false,
    messageCacheCap: 150,
    rasterThreads: "auto",
};

let cached: QuietPerformanceConfig | null = null;

function readPluginSettings() {
    const { plugins } = RendererSettings.store as { plugins?: Record<string, Record<string, unknown>>; };
    return plugins?.QuietPerformance;
}

function resolveCdnPolicy(plugin: Record<string, unknown> | undefined): CdnPolicy {
    const policy = plugin?.cdnPolicy;
    if (policy === "normal" || policy === "efficient" || policy === "textOnly") return policy;
    if (plugin?.blockHeavyCdn === true) return "textOnly";
    return "normal";
}

function resolveRasterThreads(plugin: Record<string, unknown> | undefined): RasterThreads {
    const v = plugin?.rasterThreads;
    if (v === "auto" || v === "1" || v === "2" || v === "4") return v;
    return "auto";
}

export function getQuietPerformance(): QuietPerformanceConfig {
    if (cached) return cached;

    const plugin = readPluginSettings();
    if (plugin?.enabled === false) {
        cached = DISABLED;
        return cached;
    }

    cached = {
        enabled: true,
        liteChromium: plugin?.liteChromium !== false,
        freezeMotion: plugin?.freezeMotion !== false,
        disableBlur: plugin?.disableBlur !== false,
        disableSpellcheck: plugin?.disableSpellcheck !== false,
        aggressiveMemory: plugin?.aggressiveMemory === true,
        disableGpu: plugin?.disableGpu === true,
        cdnPolicy: resolveCdnPolicy(plugin),
        trimMessageCache: plugin?.trimMessageCache !== false,
        messageCacheCap: typeof plugin?.messageCacheCap === "number" ? plugin.messageCacheCap : 60,
        rasterThreads: resolveRasterThreads(plugin),
    };
    return cached;
}

const CDN_URLS = [
    "*://cdn.discordapp.com/*",
    "*://cdn.discordapp.net/*",
    "*://media.discordapp.net/*",
    "*://*.discordapp.net/*",
];

function shouldBlockCdnRequest(url: string, resourceType: string, policy: CdnPolicy): boolean {
    if (policy === "normal") return false;
    if (policy === "textOnly") {
        return resourceType === "image" || resourceType === "media";
    }
    if (resourceType === "media") return true;
    if (resourceType !== "image") return false;

    const u = url.toLowerCase();
    if (u.includes("/attachments/")) return true;
    if (u.includes(".gif") || u.includes("format=gif")) return true;
    if (u.includes("avatar-decoration") || u.includes("/decor/")) return true;
    if (u.includes("/banners/") && u.includes("a_")) return true;
    if (u.includes("/profile-effects/")) return true;

    return false;
}

function installCdnGuard() {
    session.defaultSession.webRequest.onBeforeRequest({ urls: CDN_URLS }, (details, callback) => {
        const policy = getQuietPerformance().cdnPolicy;
        if (shouldBlockCdnRequest(details.url, details.resourceType, policy)) {
            callback({ cancel: true });
            return;
        }
        callback({});
    });
}

function armChromiumFeatures(disable: string[], enable: string[]) {
    const disableSet = new Set(disable);
    const enableSet = new Set(enable);
    const { commandLine } = app;
    const original = commandLine.appendSwitch.bind(commandLine);

    commandLine.appendSwitch = ((switchName: string, value?: string) => {
        if (switchName === "disable-features" || switchName === "enable-features") {
            const bucket = switchName === "disable-features" ? disableSet : enableSet;
            for (const part of (value ?? "").split(",")) {
                const trimmed = part.trim();
                if (trimmed) bucket.add(trimmed);
            }
            return original(switchName, [...bucket].join(","));
        }
        return original(switchName, value);
    }) as typeof commandLine.appendSwitch;

    if (disableSet.size) original("disable-features", [...disableSet].join(","));
    if (enableSet.size) original("enable-features", [...enableSet].join(","));
}

export function applyQuietRuntime() {
    const perf = getQuietPerformance();
    if (!perf.enabled) {
        console.log("[Quiet] performance: disabled");
        return;
    }

    if (perf.disableGpu) {
        try {
            app.disableHardwareAcceleration();
        } catch (err) {
            console.error("[Quiet] performance: disableHardwareAcceleration failed", err);
        }
    }

    if (perf.liteChromium) {
        const disable = [
            "SpareRendererForSitePerProcess",
            "BackForwardCache",
            "MediaRouter",
            "DialMediaRouteProvider",
        ];
        const enable = process.platform === "win32" ? ["UseEcoQoSForBackgroundProcess"] : [];

        try {
            armChromiumFeatures(disable, enable);
            if (perf.rasterThreads !== "auto") {
                app.commandLine.appendSwitch("num-raster-threads", perf.rasterThreads);
            }
        } catch (err) {
            console.error("[Quiet] performance: chromium flags", err);
        }
    }

    if (perf.aggressiveMemory) {
        try {
            app.commandLine.appendSwitch("js-flags", "--optimize-for-size");
        } catch (err) {
            console.error("[Quiet] performance: js-flags", err);
        }
    }

    app.whenReady().then(() => {
        try {
            installCdnGuard();
        } catch (err) {
            console.error("[Quiet] performance: CDN guard", err);
        }

        if (getQuietPerformance().disableSpellcheck) {
            try {
                session.defaultSession.setSpellCheckerEnabled(false);
            } catch (err) {
                console.error("[Quiet] performance: spellchecker", err);
            }
        }

        startMetricsSampler();
    });
}

export function applyQuietWindowOptions(options: BrowserWindowConstructorOptions) {
    const perf = getQuietPerformance();
    if (!perf.enabled || !options.webPreferences) return;

    if (perf.disableSpellcheck)
        options.webPreferences.spellcheck = false;
}
