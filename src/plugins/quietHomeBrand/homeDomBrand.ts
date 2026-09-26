/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CLIENT_LOGO_RAW_URL } from "@shared/brand";
import { logoDataUrl } from "@shared/brandAssets";
import { markPatchApplied, markPatchNoEffect, markPatchSkipped } from "@shared/quietPatchHealth";
import { debounce } from "@shared/debounce";
import { Logger } from "@utils/Logger";

import {
    refreshHomeBrandHealthSnapshot,
    setHomeFindStrategy,
    type HomeFindStrategy,
} from "./homeBrandHealth";
import { HOME_BRAND_DOM_PATCH_ID } from "./patchHealth";

const logger = new Logger("QuietHomeBrand");

const OVERLAY_CLASS = "vc-quiet-home-overlay";

let observer: MutationObserver | null = null;
let getSizePx: () => number = () => 32;
let lastTarget: HTMLElement | null = null;
let warnedMissing = false;

let pluginEnabled = false;

function getGuildNav(): Element | null {
    return document.querySelector('nav[aria-label*="Server" i]')
        ?? document.querySelector('nav[aria-label*="servidor" i]')
        ?? document.querySelector("nav[class*='guilds']");
}

function findHomeListItem(): { item: HTMLElement; strategy: HomeFindStrategy } | null {
    const idSelectors = [
        '[data-list-item-id="guildsnav___home"]',
        '[data-list-item-id="guildsnav__home"]',
        '[data-list-item-id*="guildsnav"][data-list-item-id*="home"]',
        '[data-list-item-id*="___home"]',
    ] as const;
    for (const sel of idSelectors) {
        const el = document.querySelector<HTMLElement>(sel);
        if (el) return { item: el, strategy: "list-id" };
    }

    const nav = getGuildNav();
    if (!nav) return null;

    for (const anchor of nav.querySelectorAll<HTMLAnchorElement>("a[href]")) {
        const href = anchor.getAttribute("href") ?? "";
        if (!href.includes("@me")) continue;
        const item = anchor.closest<HTMLElement>("[class*='listItem']");
        if (item) return { item, strategy: "@me" };
    }

    const scroller = nav.querySelector("[class*='scroller']") ?? nav;
    const firstItem = scroller.querySelector<HTMLElement>("[class*='listItem']");
    if (firstItem) return { item: firstItem, strategy: "first-item" };
    return null;
}

function getMountTarget(item: HTMLElement): HTMLElement {
    return item.querySelector<HTMLElement>("[class*='childWrapper']")
        ?? item.querySelector<HTMLElement>("[class*='wrapper']")
        ?? item;
}

function markLogoReady(target: HTMLElement, ready: boolean) {
    if (ready) target.setAttribute("data-vc-quiet-home-ready", "true");
    else target.removeAttribute("data-vc-quiet-home-ready");
}

function mountHomeLogoImg(target: HTMLElement) {
    if (target.querySelector(".vc-quiet-home-nav-icon")) {
        markLogoReady(target, true);
        return;
    }

    let img = target.querySelector<HTMLImageElement>(`img.${OVERLAY_CLASS}`);
    if (!img) {
        img = document.createElement("img");
        img.className = OVERLAY_CLASS;
        img.alt = "";
        img.draggable = false;
        target.appendChild(img);
    }

    const size = getSizePx();
    img.width = size;
    img.height = size;

    const onReady = () => {
        markLogoReady(target, true);
        markPatchApplied(HOME_BRAND_DOM_PATCH_ID, "dom");
        refreshHomeBrandHealthSnapshot(pluginEnabled);
    };
    const onFail = () => {
        if (img!.src !== CLIENT_LOGO_RAW_URL) {
            img!.src = CLIENT_LOGO_RAW_URL;
            return;
        }
        markLogoReady(target, false);
        markPatchNoEffect(HOME_BRAND_DOM_PATCH_ID, "dom", "logo-load");
        refreshHomeBrandHealthSnapshot(pluginEnabled);
    };

    img.onload = onReady;
    img.onerror = onFail;

    if (!img.src || img.src === window.location.href) img.src = logoDataUrl;
    else if (img.src !== logoDataUrl && !img.src.includes("logo.png")) img.src = logoDataUrl;

    if (img.complete && img.naturalWidth > 0) onReady();
}

function markHomeButton() {
    const found = findHomeListItem();
    const item = found?.item ?? null;
    const target = item ? getMountTarget(item) : null;

    setHomeFindStrategy(found?.strategy ?? null);

    for (const img of document.querySelectorAll<HTMLImageElement>(`img.${OVERLAY_CLASS}`)) {
        if (!target || !target.contains(img)) img.remove();
    }

    if (!target) {
        if (!warnedMissing) {
            warnedMissing = true;
            logger.warn("Home button not found yet — will retry when guild nav mounts");
        }
        lastTarget?.removeAttribute("data-vc-quiet-home");
        lastTarget?.removeAttribute("data-vc-quiet-home-ready");
        lastTarget = null;
        refreshHomeBrandHealthSnapshot(pluginEnabled);
        return;
    }

    warnedMissing = false;

    if (lastTarget && lastTarget !== target) {
        lastTarget.removeAttribute("data-vc-quiet-home");
        lastTarget.removeAttribute("data-vc-quiet-home-ready");
    }
    lastTarget = target;

    item!.setAttribute("data-vc-quiet-home-item", "true");
    target.setAttribute("data-vc-quiet-home", "true");
    if (getComputedStyle(target).position === "static") {
        target.style.position = "relative";
    }
    mountHomeLogoImg(target);
    refreshHomeBrandHealthSnapshot(pluginEnabled);
}

export function refreshHomeDomBrand() {
    markHomeButton();
}

export function refreshHomeDomBrandSize(sizePx: number) {
    getSizePx = () => sizePx;
    document.querySelectorAll<HTMLImageElement>(`img.${OVERLAY_CLASS}`).forEach(img => {
        img.width = sizePx;
        img.height = sizePx;
    });
}

export function startHomeDomBrand(readSizePx: () => number) {
    stopHomeDomBrand();
    pluginEnabled = true;
    getSizePx = readSizePx;
    warnedMissing = false;
    refreshHomeBrandHealthSnapshot(true);
    const run = debounce(markHomeButton, 50);
    run();
    observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
}

export function stopHomeDomBrand() {
    observer?.disconnect();
    observer = null;
    lastTarget = null;
    warnedMissing = false;
    pluginEnabled = false;
    markPatchSkipped(HOME_BRAND_DOM_PATCH_ID, "home brand disabled or plugin stopped");
    document.querySelectorAll("[data-vc-quiet-home]").forEach(el => {
        el.removeAttribute("data-vc-quiet-home");
        el.removeAttribute("data-vc-quiet-home-ready");
    });
    document.querySelectorAll("[data-vc-quiet-home-item]").forEach(el => el.removeAttribute("data-vc-quiet-home-item"));
    document.querySelectorAll(`img.${OVERLAY_CLASS}`).forEach(el => el.remove());
    refreshHomeBrandHealthSnapshot(false);
}
