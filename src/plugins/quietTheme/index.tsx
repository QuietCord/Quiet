/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import managedStyle from "./style.css?managed";

import { faviconDataUrl } from "@shared/brandAssets";
import definePlugin, { StartAt } from "@utils/types";

import { applyQuietVisualRefresh, disableQuietVisualRefresh } from "./applyVisualRefresh";

const FAVICON_SELECTOR = 'link[rel="icon"], link[rel="shortcut icon"]';

let faviconObserver: MutationObserver | null = null;

function applyDocumentFavicon() {
    let link = document.querySelector<HTMLLinkElement>(FAVICON_SELECTOR);
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }
    link.type = "image/x-icon";
    link.href = faviconDataUrl;
}

export default definePlugin({
    name: "QuietTheme",
    description: "Quiet brand colors — warm stone surfaces and amber accents (Discord Visual Refresh).",
    tags: ["Quiet", "Appearance", "Theme"],
    authors: [{ name: "hyusband", id: 0n }],
    enabledByDefault: true,
    managedStyle,
    startAt: StartAt.DOMContentLoaded,

    settingsAboutComponent: () => (
        <span>
            Tints Discord&apos;s Visual Refresh neutrals toward warm stone and sets amber accents. Turn off ClientTheme if both fight each other. Console CORS/affinities noise is unrelated.
        </span>
    ),

    start() {
        document.documentElement.classList.add("vc-quiet-theme");
        applyDocumentFavicon();
        faviconObserver = new MutationObserver(() => applyDocumentFavicon());
        faviconObserver.observe(document.head, { childList: true, subtree: true });
        void applyQuietVisualRefresh();
    },

    stop() {
        document.documentElement.classList.remove("vc-quiet-theme");
        faviconObserver?.disconnect();
        faviconObserver = null;
        disableQuietVisualRefresh();
    },
});
