/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import managedStyle from "./style.css?managed";

import { definePluginSettings } from "@api/Settings";
import { BrandLogoIcon } from "@components/BrandLogoIcon";
import { QuietHubHomeIcon } from "@components/QuietHubHomeIcon";
import { CLIENT_LOGO_RAW_URL } from "@shared/brand";
import definePlugin from "@utils/types";
import { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import "./patchHealth";

import { refreshHomeDomBrand, refreshHomeDomBrandSize, startHomeDomBrand, stopHomeDomBrand } from "./homeDomBrand";
import { refreshHomeBrandHealthSnapshot } from "./homeBrandHealth";

export const settings = definePluginSettings({
    replaceHomeButton: {
        type: OptionType.BOOLEAN,
        description: "Replace the Discord logo on the top server-list button (DMs / Home) with the Quiet icon.",
        default: true,
        onChange(enabled: boolean) {
            if (enabled) {
                syncHomeBrandCss();
                document.documentElement.classList.add("vc-quiet-home-brand");
                startHomeDomBrand(readHomeIconSize);
            } else {
                stopHomeDomBrand();
                document.documentElement.classList.remove("vc-quiet-home-brand");
                refreshHomeBrandHealthSnapshot(false);
            }
        },
    },
    homeIconStyle: {
        type: OptionType.SELECT,
        description: "Which Quiet icon to show on the home button (webpack patch path only).",
        options: [
            { label: "Cat in box (default logo)", value: "brand", default: true },
            { label: "Cat in casita (Hub)", value: "hub" },
        ],
    },
    homeIconSize: {
        type: OptionType.NUMBER,
        description: "Home button logo size in pixels (fits the 48px circle).",
        default: 32,
        onChange: () => {
            syncHomeBrandCss();
            refreshHomeDomBrandSize(readHomeIconSize());
        },
    },
});

function readHomeIconSize() {
    return Math.min(44, Math.max(24, settings.store.homeIconSize || 32));
}

/** CSS background via HTTPS (same pattern as Midnight / nattsvart BD themes). */
function syncHomeBrandCss() {
    const size = readHomeIconSize();
    document.documentElement.style.setProperty("--vc-quiet-home-logo-url", `url("${CLIENT_LOGO_RAW_URL}")`);
    document.documentElement.style.setProperty("--vc-quiet-home-logo-size", `${size}px`);
}

function renderQuietHomeIcon() {
    const size = readHomeIconSize();
    if (settings.store.homeIconStyle === "hub") {
        return <QuietHubHomeIcon width={size} height={size} className="vc-quiet-home-nav-icon" />;
    }
    return <BrandLogoIcon width={size} height={size} className="vc-quiet-home-nav-icon" />;
}

const homeIconPatch = {
    match: /tutorialId:"friends-list",icon:(\i)/,
    replace: "tutorialId:\"friends-list\",icon:$self.wrapHomeIcon($1),"
};

const homeIconPatchReversed = {
    match: /icon:(\i),tutorialId:"friends-list"/,
    replace: "icon:$self.wrapHomeIcon($1),tutorialId:\"friends-list\""
};

export default definePlugin({
    name: "QuietHomeBrand",
    description: "Replace the Discord home button in the server list with the Quiet logo.",
    tags: ["Quiet", "Appearance"],
    authors: [{ name: "hyusband", id: 0n }],
    enabledByDefault: true,
    settings,
    managedStyle,

    settingsAboutComponent: () => (
        <span>
            Taskbar icon = main process. Top DMs circle = this plugin (CSS + <code>&lt;img&gt;</code> on <code>guildsnav___home</code>) — Discord changes that node often; we re-apply on DOM updates.
        </span>
    ),

    patches: [
        {
            patchId: "home-brand-icon-discodo",
            find: "#{intl::DISCODO_DISABLED}",
            predicate: () => settings.store.replaceHomeButton,
            replacement: homeIconPatch,
        },
        {
            patchId: "home-brand-icon-friends-list",
            find: 'tutorialId:"friends-list"',
            predicate: () => settings.store.replaceHomeButton,
            replacement: [homeIconPatch, homeIconPatchReversed],
        },
    ],

    wrapHomeIcon(Original: React.ComponentType<any>) {
        return (props: Record<string, unknown>) => {
            if (!settings.store.replaceHomeButton) {
                return React.createElement(Original, props);
            }
            return renderQuietHomeIcon();
        };
    },

    flux: {
        CONNECTION_OPEN() {
            if (settings.store.replaceHomeButton) {
                refreshHomeDomBrand();
                refreshHomeBrandHealthSnapshot(true);
            }
        },
    },

    start() {
        if (!settings.store.replaceHomeButton) {
            refreshHomeBrandHealthSnapshot(false);
            return;
        }
        syncHomeBrandCss();
        document.documentElement.classList.add("vc-quiet-home-brand");
        startHomeDomBrand(readHomeIconSize);
        refreshHomeBrandHealthSnapshot(true);
    },

    stop() {
        stopHomeDomBrand();
        refreshHomeBrandHealthSnapshot(false);
        document.documentElement.classList.remove("vc-quiet-home-brand");
        document.documentElement.style.removeProperty("--vc-quiet-home-logo-url");
        document.documentElement.style.removeProperty("--vc-quiet-home-logo-size");
    },
});
