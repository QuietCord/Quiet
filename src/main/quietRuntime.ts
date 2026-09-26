/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app, BrowserWindowConstructorOptions, session } from "electron";

import { RendererSettings } from "./settings";

export interface QuietPerformanceConfig {
    enabled: boolean;
    liteChromium: boolean;
    freezeMotion: boolean;
    disableBlur: boolean;
    throttleUnfocused: boolean;
    disableSpellcheck: boolean;
    aggressiveMemory: boolean;
    disableGpu: boolean;
    blockHeavyCdn: boolean;
    trimMessageCache: boolean;
    messageCacheCap: number;
}

const DISABLED: QuietPerformanceConfig = {
    enabled: false,
    liteChromium: false,
    freezeMotion: false,
    disableBlur: false,
    throttleUnfocused: false,
    disableSpellcheck: false,
    aggressiveMemory: false,
    disableGpu: false,
    blockHeavyCdn: false,
    trimMessageCache: false,
    messageCacheCap: 150,
};

let cached: QuietPerformanceConfig | null = null;

function readPluginSettings() {
    const { plugins } = RendererSettings.store as { plugins?: Record<string, Record<string, unknown>>; };
    return plugins?.QuietPerformance;
}

/** Missing keys mean "on" so the first launch matches the plugin defaults. */
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
        throttleUnfocused: plugin?.throttleUnfocused !== false,
        disableSpellcheck: plugin?.disableSpellcheck !== false,
        aggressiveMemory: plugin?.aggressiveMemory === true,
        disableGpu: plugin?.disableGpu === true,
        blockHeavyCdn: plugin?.blockHeavyCdn === true,
        trimMessageCache: plugin?.trimMessageCache !== false,
        messageCacheCap: typeof plugin?.messageCacheCap === "number" ? plugin.messageCacheCap : 60,
    };
    return cached;
}

const CDN_URLS = [
    "*://cdn.discordapp.com/*",
    "*://cdn.discordapp.net/*",
    "*://media.discordapp.net/*",
    "*://*.discordapp.net/*",
];

function installCdnGuard() {
    const ses = session.defaultSession;
    ses.webRequest.onBeforeRequest({ urls: CDN_URLS }, (details, callback) => {
        if (!getQuietPerformance().blockHeavyCdn) {
            callback({});
            return;
        }
        const { resourceType } = details;
        if (resourceType === "image" || resourceType === "media") {
            callback({ cancel: true });
            return;
        }
        callback({});
    });
    console.log("[Quiet] performance: CDN media guard armed (toggle blockHeavyCdn)");
}

/**
 * Chromium reads these before ready. Discord may call appendSwitch("disable-features")
 * later and replace the value, so later calls are merged with ours.
 */
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

/** Call before Discord's app.asar main runs. */
export function applyQuietRuntime() {
    const perf = getQuietPerformance();
    if (!perf.enabled) {
        console.log("[Quiet] performance: disabled");
        return;
    }

    if (perf.disableGpu) {
        try {
            app.disableHardwareAcceleration();
            console.log("[Quiet] performance: hardware acceleration disabled");
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
            "HardwareMediaKeyHandling",
        ];
        const enable = process.platform === "win32" ? ["UseEcoQoSForBackgroundProcess"] : [];

        try {
            armChromiumFeatures(disable, enable);
            app.commandLine.appendSwitch("num-raster-threads", "2");
            console.log("[Quiet] performance: lite chromium flags armed");
        } catch (err) {
            console.error("[Quiet] performance: failed to set chromium flags", err);
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

        if (!getQuietPerformance().disableSpellcheck) return;
        try {
            session.defaultSession.setSpellCheckerEnabled(false);
        } catch (err) {
            console.error("[Quiet] performance: spellchecker", err);
        }
    });
}

export function applyQuietWindowOptions(options: BrowserWindowConstructorOptions) {
    const perf = getQuietPerformance();
    if (!perf.enabled || !options.webPreferences) return;

    if (perf.throttleUnfocused)
        options.webPreferences.backgroundThrottling = true;

    if (perf.disableSpellcheck)
        options.webPreferences.spellcheck = false;
}
