/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { swapSplitWithMain } from "./actions";
import { splitCommands } from "./commands";
import { channelContextPatch, userContextPatch } from "./contextMenu";
import { closeSplitView, getSplitPanelState, isSplitPanelOpen, settings } from "./splitStore";
import { getMainChatChannelId, SplitSidePanel } from "./SplitSidePanel";
import style from "./style.css?managed";

import definePlugin from "@utils/types";
import {
    SelectedChannelStore,
    SelectedGuildStore,
    showToast,
    Toasts,
} from "@webpack/common";

import { ChannelSectionStore } from "./webpackStores";

export { settings } from "./splitStore";

let keyHandler: ((e: KeyboardEvent) => void) | null = null;

export default definePlugin({
    name: "QuietSplitView",
    description: "Main + side panel — two conversations at once with resize, swap, pin, and shortcuts. Quiet take on sidebar chat.",
    tags: ["Quiet", "Chat", "Utility"],
    authors: [{ name: "hyusband", id: 0n }],
    enabledByDefault: true,
    settings,
    managedStyle: style,
    commands: splitCommands,

    settingsAboutComponent: () => (
        <span>
            Right-click a channel or user → <strong>Open in Quiet Sideview</strong>. Use swap/pin in the side header,
            <code>/split</code>, or Ctrl+Alt+S (swap) / Ctrl+Alt+\ (toggle). Only one side panel — keeps Discord simple.
        </span>
    ),

    contextMenus: {
        "channel-context": channelContextPatch,
        "thread-context": channelContextPatch,
        "gdm-context": channelContextPatch,
        "user-context": userContextPatch,
    },

    patches: [
        {
            find: 'case"pendingFriends":',
            group: true,
            noWarn: true,
            replacement: [
                {
                    match: /ChannelRenderer"\),/,
                    replace: "$&vc_QuietSplit=$self.renderSplitPanel(),",
                },
                {
                    match: /(?<=return )null!=\i&&\i\?\(0,\i\.jsx\)\(\i,\{channel:\i\},\i\.id\):\(0,\i\.jsx\)\(\i,\{\}\)(?=\},)/,
                    replace: "[$&,vc_QuietSplit]",
                },
            ],
        },
        {
            find: "loadComplete: resetting state for channelId=",
            group: true,
            noWarn: true,
            replacement: [
                {
                    match: /truncateTop\(\i\)\{(?=.{0,100}?this\._array\.length-\i;return)/,
                    replace: "$&if($self.hasDualChatView(this.channelId))return this;",
                },
                {
                    match: /truncateBottom\(\i\)\{(?=.{0,100}?return this\._array\.length<=\i\?this:this\.mutate\()/,
                    replace: "$&if($self.hasDualChatView(this.channelId))return this;",
                },
            ],
        },
    ],

    toolboxActions: {
        "Move side to main"() {
            swapSplitWithMain();
        },
        "Close Quiet Sideview"() {
            closeSplitView();
            showToast("Side panel closed", Toasts.Type.MESSAGE);
        },
    },

    flux: {
        CHANNEL_SELECT({ channelId }: { channelId?: string; }) {
            if (!channelId) return;
            const side = getSplitPanelState();
            if (!side.channelId || side.pinned) return;
            if (channelId === side.channelId) {
                closeSplitView();
            }
        },
    },

    hasDualChatView(channelId: string) {
        const mainChannelId = SelectedChannelStore.getChannelId();
        const sidebarHidden = ChannelSectionStore.getSidebarState(mainChannelId)
            || ChannelSectionStore.getGuildSidebarState(SelectedGuildStore.getGuildId() ?? undefined);
        const sideId = getSplitPanelState().channelId;
        const views = Number(channelId === mainChannelId || channelId === getMainChatChannelId())
            + Number(!sidebarHidden && sideId && channelId === sideId);
        return views > 1;
    },

    renderSplitPanel() {
        return <SplitSidePanel />;
    },

    start() {
        keyHandler = (e: KeyboardEvent) => {
            if (!settings.store.enableShortcut) return;
            if (!e.ctrlKey || !e.altKey) return;
            if (e.key === "s" || e.key === "S") {
                e.preventDefault();
                swapSplitWithMain();
            } else if (e.key === "\\" || e.code === "Backslash") {
                e.preventDefault();
                if (isSplitPanelOpen()) closeSplitView();
                else showToast("Open a side channel from the context menu first", Toasts.Type.MESSAGE);
            }
        };
        window.addEventListener("keydown", keyHandler, true);
    },

    stop() {
        if (keyHandler) window.removeEventListener("keydown", keyHandler, true);
        keyHandler = null;
        closeSplitView();
    },
});
