/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { CLIENT_WINDOW_TITLE } from "@shared/brand";
import definePlugin from "@utils/types";
import { OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";

const flashPageTitle = findByCodeLazy("=>({flashQueue:[", "title");

export const rootTitle = { base: null as string | null };

export const settings = definePluginSettings({
    windowTitle: {
        type: OptionType.STRING,
        default: CLIENT_WINDOW_TITLE,
        description: `Window title brand (e.g. "${CLIENT_WINDOW_TITLE} | Friends"). "Discord" is stripped, not duplicated.`,
        onChange: applyWindowTitle,
    },
});

function getBaseTitle() {
    return settings.store.windowTitle.trim() || CLIENT_WINDOW_TITLE;
}

/** Discord uses e.g. "QuietCord | friends | Discord" — drop the trailing Discord segment. */
export function patchTitleString(title: string) {
    if (!title) return getBaseTitle();

    const base = getBaseTitle();
    const parts = title.split("|").map(p => p.trim()).filter(Boolean);
    const kept: string[] = [];

    for (const part of parts) {
        if (/^discord$/i.test(part)) continue;
        if (part.toLowerCase() === base.toLowerCase()) {
            if (kept.some(p => p.toLowerCase() === base.toLowerCase())) continue;
        }
        kept.push(part);
    }

    if (kept.length === 0) return base;
    if (kept[0].toLowerCase() !== base.toLowerCase()) return `${base} | ${kept.join(" | ")}`;
    return kept.join(" | ");
}

function applyWindowTitle() {
    rootTitle.base = getBaseTitle();
    try {
        flashPageTitle({ messages: 0 })();
    } catch { /* patch may be broken on this Discord build */ }
    syncDocumentTitle();
}

function syncDocumentTitle() {
    const next = patchTitleString(document.title);
    if (next && next !== document.title) document.title = next;
}

let titleObserver: MutationObserver | null = null;
let titleSetterInstalled = false;

function installTitleInterceptor() {
    if (titleSetterInstalled) return;
    titleSetterInstalled = true;

    const proto = Document.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "title")
        ?? Object.getOwnPropertyDescriptor(HTMLDocument.prototype, "title");
    if (!desc?.set || !desc?.get) return;

    const nativeGet = desc.get.bind(document);
    const nativeSet = desc.set.bind(document);

    Object.defineProperty(document, "title", {
        configurable: true,
        enumerable: desc.enumerable ?? true,
        get() {
            return nativeGet();
        },
        set(value: string) {
            nativeSet(patchTitleString(value));
        },
    });
}

function installTitleObserver() {
    titleObserver?.disconnect();

    const observeTitleEl = (el: Element) => {
        titleObserver = new MutationObserver(syncDocumentTitle);
        titleObserver.observe(el, { childList: true, characterData: true, subtree: true });
        syncDocumentTitle();
    };

    const existing = document.querySelector("title");
    if (existing) {
        observeTitleEl(existing);
        return;
    }

    const wait = new MutationObserver((_, obs) => {
        const el = document.querySelector("title");
        if (!el) return;
        obs.disconnect();
        observeTitleEl(el);
    });
    wait.observe(document.documentElement, { childList: true, subtree: true });
}

export default definePlugin({
    name: "QuietWindowTitle",
    description: "QuietCord in the window title; removes Discord’s trailing suffix.",
    tags: ["Quiet", "Appearance"],
    authors: [{ name: "hyusband", id: 0n }],
    enabledByDefault: true,
    settings,

    patches: [
        {
            patchId: "window-title-base",
            find: 'isPlatformEmbedded?void 0:"Discord"',
            replacement: {
                match: /\{base:\i(?:\("?\d+?"?\))?\.isPlatformEmbedded\?void 0:"Discord"\}/,
                replace: "$self.rootTitle",
            },
        },
    ],

    getBaseTitle,

    start() {
        installTitleInterceptor();
        applyWindowTitle();
        installTitleObserver();
    },

    stop() {
        titleObserver?.disconnect();
        titleObserver = null;
        rootTitle.base = null;
        titleSetterInstalled = false;
    },

    rootTitle,
});
