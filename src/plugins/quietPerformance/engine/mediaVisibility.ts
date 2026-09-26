/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { bumpResourceBudget } from "./resourceBudget";
import { isBackgroundMode } from "./adaptiveBackground";
import { isRuntimeFeatureEnabled } from "./runtimeEffective";

function mediaVisibilityActive() {
    return isRuntimeFeatureEnabled("mediaVisibleOnly");
}

const observed = new WeakSet<Element>();
let observer: IntersectionObserver | null = null;
let mutationObserver: MutationObserver | null = null;
let started = false;

function isGifLike(el: Element) {
    if (el.tagName === "VIDEO") return true;
    if (el.tagName !== "IMG") return false;
    const src = (el as HTMLImageElement).src ?? "";
    return src.includes(".gif") || src.includes("/gif");
}

const OFFSCREEN_UNLOAD_MS = 10 * 60 * 1000;
const lastVisibleAt = new WeakMap<Element, number>();

function applyMediaState(el: Element, visible: boolean) {
    bumpResourceBudget("mediaVisibilityCallbacks", 1);
    const now = Date.now();
    if (visible) lastVisibleAt.set(el, now);
    const lastSeen = lastVisibleAt.get(el) ?? now;

    if (el.tagName === "VIDEO") {
        const v = el as HTMLVideoElement;
        if (!visible || isBackgroundMode()) {
            try { v.pause(); } catch { /* noop */ }
            v.dataset.vcQuietPaused = "1";
        } else if (v.dataset.vcQuietPaused && mediaVisibilityActive()) {
            delete v.dataset.vcQuietPaused;
            try { void v.play(); } catch { /* user gesture */ }
        }
        if (!visible && v.dataset.vcQuietSrc) {
            if (now - lastSeen > OFFSCREEN_UNLOAD_MS && !v.dataset.vcQuietUnloaded) {
                v.dataset.vcQuietUnloaded = "1";
                v.removeAttribute("src");
                v.load();
            }
        } else if (visible && v.dataset.vcQuietUnloaded && v.dataset.vcQuietSrc) {
            v.src = v.dataset.vcQuietSrc;
            delete v.dataset.vcQuietUnloaded;
        }
        return;
    }
    if (el.tagName === "IMG" && isGifLike(el)) {
        const img = el as HTMLImageElement;
        if (!visible) {
            img.style.contentVisibility = "hidden";
            if (now - lastSeen > OFFSCREEN_UNLOAD_MS && img.src && !img.dataset.vcQuietSrc) {
                img.dataset.vcQuietSrc = img.src;
                img.removeAttribute("src");
                img.dataset.vcQuietUnloaded = "1";
            }
        } else {
            img.style.contentVisibility = "";
            if (img.dataset.vcQuietUnloaded && img.dataset.vcQuietSrc) {
                img.src = img.dataset.vcQuietSrc;
                delete img.dataset.vcQuietUnloaded;
            }
        }
    }
}

function observeElement(el: Element) {
    if (observed.has(el) || !observer) return;
    observed.add(el);
    lastVisibleAt.set(el, Date.now());
    if (el.tagName === "VIDEO") {
        const v = el as HTMLVideoElement;
        if (v.src && !v.dataset.vcQuietSrc) v.dataset.vcQuietSrc = v.src;
    }
    observer.observe(el);
}

function scan(root: ParentNode) {
    if (!mediaVisibilityActive()) return;
    root.querySelectorAll("video, img").forEach(el => {
        if (isGifLike(el)) observeElement(el);
    });
}

export function startMediaVisibilityEngine() {
    if (started || !mediaVisibilityActive()) return;
    if (typeof IntersectionObserver === "undefined") return;
    started = true;

    observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
            applyMediaState(entry.target, entry.isIntersecting);
        }
    }, { root: null, rootMargin: "120px 0px", threshold: 0.01 });

    scan(document.body);
    mutationObserver = new MutationObserver(mutations => {
        for (const m of mutations) {
            m.addedNodes.forEach(node => {
                if (node instanceof Element) {
                    if (isGifLike(node)) observeElement(node);
                    scan(node);
                }
            });
        }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
}

export function stopMediaVisibilityEngine() {
    document.querySelectorAll("img[data-vc-quiet-src], video[data-vc-quiet-src]").forEach(el => {
        if (el instanceof HTMLImageElement || el instanceof HTMLVideoElement) {
            if (el.dataset.vcQuietSrc) el.src = el.dataset.vcQuietSrc;
            delete el.dataset.vcQuietUnloaded;
            delete el.dataset.vcQuietSrc;
            delete el.dataset.vcQuietPaused;
            el.style.contentVisibility = "";
        }
    });

    started = false;
    observer?.disconnect();
    observer = null;
    mutationObserver?.disconnect();
    mutationObserver = null;
}

export function syncMediaVisibilityEngine() {
    stopMediaVisibilityEngine();
    startMediaVisibilityEngine();
}
