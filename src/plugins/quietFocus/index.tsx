/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import managedStyle from "./style.css?managed";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import definePlugin from "@utils/types";
import { SelectedChannelStore, showToast, Toasts } from "@webpack/common";

import { applyFocusOptionClasses } from "./applyFocusClasses";
import { focusCommands } from "./commands";
import { FocusChatBarButton } from "./FocusChatButton";
import { FocusModeButton } from "./FocusButton";
import { endFocus, getFocusSession, startFocus, subscribeFocusSession, syncFocusDom, toggleFocus } from "./focusState";
import { enforceMentionScope } from "./mentionScope";
import { settings } from "./settings";

export { settings } from "./settings";

let unsubFocusSession: (() => void) | undefined;

function syncServerListButton() {
    removeServerListElement(ServerListRenderPosition.Above, FocusModeButton);
    if (settings.store.showServerListButton) {
        addServerListElement(ServerListRenderPosition.Above, FocusModeButton);
    }
}

export default definePlugin({
    name: "QuietFocus",
    description: "Focus Mode — temporary minimal Discord UI (member list, promos, decorations off). Optional timed DMs + @mentions scope.",
    tags: ["Quiet", "Appearance", "Utility"],
    authors: [{ name: "hyusband", id: 0n }],
    enabledByDefault: true,
    dependencies: ["ServerListAPI"],
    settings,

    managedStyle,

    settingsAboutComponent: () => (
        <span>
            Separate from QuietPerformance. Server list button (click: minimal UI until off; right-click: timed DMs + mentions),
            optional chat bar toggle, or <code>/focus</code>. Tune hidden UI elements below.
        </span>
    ),

    commands: focusCommands,

    chatBarButton: {
        render: FocusChatBarButton,
    },

    toolboxActions: {
        "Toggle Focus Mode"() {
            toggleFocus();
            showToast(getFocusSession().active ? "Focus Mode on" : "Focus Mode off", Toasts.Type.SUCCESS);
        },
        "Focus: DMs + mentions (timed)"() {
            startFocus({
                dmsAndMentions: true,
                durationMin: settings.store.sessionDurationMin || 60,
            });
        },
    },

    flux: {
        CHANNEL_SELECT({ channelId }: { channelId?: string; }) {
            enforceMentionScope(channelId);
        },
    },

    start() {
        syncFocusDom();
        unsubFocusSession = subscribeFocusSession(() => {
            syncFocusDom();
            applyFocusOptionClasses();
            const s = getFocusSession();
            if (s.active && s.dmsAndMentions) {
                enforceMentionScope(SelectedChannelStore.getChannelId());
            }
        });
        syncServerListButton();
    },

    stop() {
        unsubFocusSession?.();
        unsubFocusSession = undefined;
        endFocus();
        removeServerListElement(ServerListRenderPosition.Above, FocusModeButton);
    },
});
