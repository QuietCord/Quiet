/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { isPluginEnabled } from "@api/PluginManager";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, showToast, Toasts } from "@webpack/common";

import { QuietTranslateChatButton } from "./ChatBarButton";
import { translateOutgoing } from "./engine";
import { QuietTranslateIcon } from "./icons";
import { getMessageContent } from "./messageContent";
import { settings } from "./settings";
import { translateMessage } from "./translateMessage";
import { QuietTranslationAccessory } from "./TranslationAccessory";

export { settings } from "./settings";

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const content = getMessageContent(message);
    if (!content) return;

    const group = findGroupChildrenByChildId("copy-text", children) ?? children;
    group.push(
        <Menu.MenuItem
            id="vc-quiet-translate"
            label="Translate (Quiet)"
            icon={QuietTranslateIcon}
            action={() => void translateMessage(message)}
        />,
    );
};

export default definePlugin({
    name: "QuietTranslator",
    description: "Manual message translation — result below the original, per-server language, optional translate-before-send. No auto bulk translate.",
    tags: ["Quiet", "Chat", "Utility"],
    authors: [{ name: "hyusband", id: 0n }],
    enabledByDefault: true,
    settings,

    settingsAboutComponent: () => (
        <span>
            Manual only: Alt+click a message, hover toolbar, or context menu. Disable stock <strong>Translate</strong> plugin to avoid duplicates.
            Per-server language in settings while viewing that guild.
        </span>
    ),

    dependencies: ["MessageEventsAPI", "MessageAccessoriesAPI", "MessagePopoverAPI", "ChatInputButtonAPI"],

    contextMenus: {
        message: messageCtxPatch,
    },

    renderMessageAccessory: props => <QuietTranslationAccessory message={props.message} />,

    chatBarButton: {
        icon: QuietTranslateIcon,
        render: QuietTranslateChatButton,
    },

    messagePopoverButton: {
        icon: QuietTranslateIcon,
        render(message: Message) {
            if (!settings.store.showMessagePopover) return null;
            const content = getMessageContent(message);
            if (!content) return null;

            return {
                label: "Translate",
                icon: QuietTranslateIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => void translateMessage(message),
            };
        },
    },

    onMessageClick(message, channel, event) {
        if (!settings.store.altClickTranslate || !event.altKey) return;
        if (event.detail > 1) return;
        const content = getMessageContent(message);
        if (!content) return;
        event.preventDefault();
        void translateMessage(message);
    },

    async onBeforeMessageSend(_, message) {
        if (!settings.store.translateBeforeSend || !message.content) return;
        try {
            const trans = await translateOutgoing(message.content);
            message.content = trans.text;
            showToast(`Sent in ${settings.store.sentTargetLanguage.toUpperCase()}`, Toasts.Type.MESSAGE);
        } catch {
            // toast from engine
        }
    },

    start() {
        if (isPluginEnabled("Translate")) {
            showToast("Disable the stock Translate plugin — QuietTranslator replaces it", Toasts.Type.MESSAGE);
        }
    },
});
