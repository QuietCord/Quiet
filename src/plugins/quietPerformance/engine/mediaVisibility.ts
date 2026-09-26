/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "../settings";
import { isBackgroundMode } from "./adaptiveBackground";

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

function applyMediaState(el: Element, visible: boolean) {
    if (el.tagName === "VIDEO") {
        const v = el as HTMLVideoElement;
        if (!visible || isBackgroundMode()) {
            try { v.pause(); } catch { /* noop */ }
            v.dataset.vcQuietPaused = "1";
        } else if (v.dataset.vcQuietPaused && settings.store.mediaVisibleOnly) {
            delete v.dataset.vcQuietPaused;
        }
        return;
    }
    if (el.tagName === "IMG" && isGifLike(el)) {
        (el as HTMLImageElement).style.contentVisibility = visible ? "" : "hidden";
    }
}

function observeElement(el: Element) {
    if (observed.has(el) || !observer) return;
    observed.add(el);
    observer.observe(el);
}

function scan(root: ParentNode) {
    if (!settings.store.mediaVisibleOnly) return;
    root.querySelectorAll("video, img").forEach(el => {
        if (isGifLike(el)) observeElement(el);
    });
}

export function startMediaVisibilityEngine() {
    if (started || !settings.store.mediaVisibleOnly) return;
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
