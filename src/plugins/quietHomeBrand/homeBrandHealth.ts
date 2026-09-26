/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { summarizePatchHealth } from "@shared/quietPatchHealth";

import { HOME_BRAND_DOM_PATCH_ID } from "./patchHealth";

export type HomeFindStrategy = "list-id" | "@me" | "first-item";

export interface HomeBrandHealth {
    enabled: boolean;
    domReady: boolean;
    waitingForNav: boolean;
    findStrategy: HomeFindStrategy | null;
    reactIconInNav: boolean;
    webpackIconPatchesOk: boolean;
    brandingOk: boolean;
}

const listeners = new Set<() => void>();

let lastHealth: HomeBrandHealth = {
    enabled: false,
    domReady: false,
    waitingForNav: false,
    findStrategy: null,
    reactIconInNav: false,
    webpackIconPatchesOk: false,
    brandingOk: false,
};

function webpackHomeIconPatchesOk() {
    const { rows } = summarizePatchHealth("QuietHomeBrand");
    const icons = rows.filter(r =>
        r.patchId === "home-brand-icon-discodo" || r.patchId === "home-brand-icon-friends-list",
    );
    return icons.some(r => r.status === "applied");
}

function detectReactIconInNav(): boolean {
    const nav = document.querySelector('nav[aria-label*="Server" i]')
        ?? document.querySelector('nav[aria-label*="servidor" i]')
        ?? document.querySelector("nav[class*='guilds']");
    return !!nav?.querySelector(".vc-quiet-home-nav-icon");
}

export function getHomeBrandHealth(): HomeBrandHealth {
    return lastHealth;
}

export function subscribeHomeBrandHealth(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

function emitHealth() {
    for (const cb of listeners) cb();
}

export function refreshHomeBrandHealthSnapshot(enabled: boolean) {
    const domReadyFromImg = !!(overlay && overlay.complete && overlay.naturalWidth > 0);

    const reactIconInNav = detectReactIconInNav();
    const webpackIconPatchesOk = webpackHomeIconPatchesOk();
    const waitingForNav = enabled
        && !domReadyFromImg
        && !reactIconInNav
        && !document.querySelector("[data-vc-quiet-home-item]");

    const brandingOk = !enabled
        || domReadyFromImg
        || !!document.querySelector("[data-vc-quiet-home-ready='true']")
        || reactIconInNav
        || webpackIconPatchesOk;

    lastHealth = {
        enabled,
        domReady: domReadyFromImg || !!document.querySelector("[data-vc-quiet-home-ready='true']"),
        waitingForNav,
        findStrategy: lastHealth.findStrategy,
        reactIconInNav,
        webpackIconPatchesOk,
        brandingOk,
    };
    emitHealth();
}

export function setHomeFindStrategy(strategy: HomeFindStrategy | null) {
    if (lastHealth.findStrategy === strategy) return;
    lastHealth = { ...lastHealth, findStrategy: strategy };
    emitHealth();
}

export function formatHomeBrandHubDetail(health: HomeBrandHealth) {
    if (!health.enabled) return "Enable QuietHomeBrand in Plugins.";
    if (health.brandingOk) {
        const parts: string[] = ["Branding OK"];
        if (health.domReady) {
            parts.push(health.findStrategy ? `DOM · ${health.findStrategy}` : "DOM overlay");
        } else if (health.reactIconInNav) {
            parts.push("React icon (webpack)");
        } else if (health.webpackIconPatchesOk) {
            parts.push("Webpack patches applied");
        }
        return parts.join(" · ");
    }
    if (health.waitingForNav) return "Waiting for server list — DOM will attach to @me or first item.";
    const { broken } = summarizePatchHealth("QuietHomeBrand");
    const iconIssues = broken.filter(r =>
        r.patchId !== HOME_BRAND_DOM_PATCH_ID,
    );
    if (iconIssues.length) {
        return `Webpack home icon not applied (${iconIssues.map(r => r.patchId).join(", ")}) · retrying DOM fallback`;
    }
    return "Home logo not mounted yet — check after login or Ctrl+R.";
}
