/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { classes } from "@utils/misc";

import { QuietTranslateIcon } from "./icons";
import { settings } from "./settings";

export const QuietTranslateChatButton: ChatBarButtonFactory = ({ isMainChat }) => {
    const { translateBeforeSend } = settings.use(["translateBeforeSend"]);
    if (!isMainChat) return null;

    const toggle = () => {
        settings.store.translateBeforeSend = !settings.store.translateBeforeSend;
    };

    return (
        <ChatBarButton
            tooltip={translateBeforeSend ? "Translate before send: ON (click to off, right-click same)" : "Translate before send: OFF (click to on)"}
            onClick={toggle}
            onContextMenu={e => {
                e.preventDefault();
                toggle();
            }}
        >
            <QuietTranslateIcon className={classes("vc-quiet-trans-chat-btn", translateBeforeSend && "vc-quiet-trans-chat-btn-on")} />
        </ChatBarButton>
    );
};
