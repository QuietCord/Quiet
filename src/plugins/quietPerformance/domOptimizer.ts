/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "./settings";

let observer: MutationObserver | null = null;
let scrollRoot: Element | null = null;

function tuneMedia(root: ParentNode) {
    if (!settings.store.pauseGifAutoplay && !settings.store.lazyMessagePaint) return;

    root.querySelectorAll<HTMLVideoElement>("video").forEach(video => {
        if (settings.store.pauseGifAutoplay) {
            video.autoplay = false;
            video.pause();
            video.preload = "none";
        }
    });

    root.querySelectorAll<HTMLImageElement>("img").forEach(img => {
        if (settings.store.lazyMessagePaint)
            img.loading ||= "lazy";
        img.decoding ||= "async";
    });
}

function onMutations(mutations: MutationRecord[]) {
    for (const m of mutations) {
        m.addedNodes.forEach(node => {
            if (node instanceof Element)
                tuneMedia(node);
        });
    }
}

function attachObserver() {
    scrollRoot = document.querySelector("[class*=scroller][class*=thin], [class*=messagesWrapper]");
    if (!scrollRoot) return;

    tuneMedia(scrollRoot);
    observer?.disconnect();
    observer = new MutationObserver(onMutations);
    observer.observe(scrollRoot, { childList: true, subtree: true });
}

export function startDomOptimizer() {
    attachObserver();
    const retry = setInterval(() => {
        if (scrollRoot) {
            clearInterval(retry);
            return;
        }
        attachObserver();
    }, 3000);
    setTimeout(() => clearInterval(retry), 60_000);
}

export function stopDomOptimizer() {
    observer?.disconnect();
    observer = null;
    scrollRoot = null;
}
