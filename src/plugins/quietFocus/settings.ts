/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

function onLayoutToggle() {
    if (document.documentElement.classList.contains("vc-focus-mode")) {
        void import("./applyFocusClasses").then(m => m.applyFocusOptionClasses());
    }
}

export const settings = definePluginSettings({
    sessionDurationMin: {
        type: OptionType.NUMBER,
        description: "Default session length in minutes (0 = until you turn Focus off manually).",
        default: 60,
    },
    dmsAndMentionsOnly: {
        type: OptionType.BOOLEAN,
        description: "When starting Focus, prefer DMs + channels with @mentions (redirects away from other guild channels).",
        default: false,
    },
    hideMemberList: {
        type: OptionType.BOOLEAN,
        description: "Hide the member list column.",
        default: true,
        onChange: onLayoutToggle,
    },
    hideActivities: {
        type: OptionType.BOOLEAN,
        description: "Hide activity / Now Playing side content where possible.",
        default: true,
        onChange: onLayoutToggle,
    },
    hidePromos: {
        type: OptionType.BOOLEAN,
        description: "Hide Nitro upsells, shop promos, and gift CTAs.",
        default: true,
        onChange: onLayoutToggle,
    },
    hideDecorations: {
        type: OptionType.BOOLEAN,
        description: "Hide avatar decorations, nameplates, and profile effect previews.",
        default: true,
        onChange: onLayoutToggle,
    },
    hideDiscover: {
        type: OptionType.BOOLEAN,
        description: "Hide Discover, Quests entry, and recommendation rails.",
        default: true,
        onChange: onLayoutToggle,
    },
    hideBanners: {
        type: OptionType.BOOLEAN,
        description: "Hide guild/user banner imagery in headers.",
        default: true,
        onChange: onLayoutToggle,
    },
    hideMutedChannels: {
        type: OptionType.BOOLEAN,
        description: "Hide muted channels in the sidebar while Focus is on.",
        default: true,
        onChange: onLayoutToggle,
    },
    showServerListButton: {
        type: OptionType.BOOLEAN,
        description: "Show the Focus button above the server list.",
        default: true,
        restartNeeded: true,
    },
    showChatBarButton: {
        type: OptionType.BOOLEAN,
        description: "Show a Focus toggle in the message input bar.",
        default: false,
        restartNeeded: true,
    },
});
