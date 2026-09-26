/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import type { CommandArgument, CommandContext } from "@vencord/discord-types";
import { ChannelStore, SelectedChannelStore } from "@webpack/common";

import { swapSplitWithMain } from "./actions";
import { getSplitChannelTitle } from "./channelTitle";
import {
    closeSplitView,
    getSplitPanelState,
    isSplitPanelOpen,
    openInSplitView,
    restorePreviousSplitView,
    toggleSplitPin,
} from "./splitStore";

const MODES = [
    { label: "Toggle side panel", value: "toggle" },
    { label: "Open current channel in side", value: "open" },
    { label: "Close side panel", value: "close" },
    { label: "Move side to main (close panel)", value: "swap" },
    { label: "Toggle pin", value: "pin" },
    { label: "Restore previous side channel", value: "previous" },
] as const;

function statusText() {
    const s = getSplitPanelState();
    if (!s.channelId) return "Side panel is **closed**.";
    const ch = ChannelStore.getChannel(s.channelId);
    const name = getSplitChannelTitle(ch);
    return `Side panel: **#${name}**${s.pinned ? " (pinned)" : ""}.`;
}

export const splitCommands = [{
    name: "split",
    description: "Quiet Split View — main + one side conversation.",
    inputType: ApplicationCommandInputType.BUILT_IN,
    options: [{
        name: "mode",
        description: "Action (default: toggle)",
        required: false,
        type: ApplicationCommandOptionType.STRING,
        choices: MODES.map(m => ({ name: m.label, value: m.value })),
    }],
    execute: async (args: CommandArgument[], ctx: CommandContext) => {
        const mode = findOption<string>(args, "mode", "toggle");

        switch (mode) {
            case "open": {
                const mainId = SelectedChannelStore.getChannelId();
                const ch = mainId ? ChannelStore.getChannel(mainId) : null;
                if (!ch) break;
                openInSplitView(ch.guild_id ?? null, ch.id);
                break;
            }
            case "close":
                closeSplitView();
                break;
            case "swap":
                swapSplitWithMain();
                break;
            case "pin":
                toggleSplitPin();
                break;
            case "previous":
                restorePreviousSplitView();
                break;
            case "toggle":
            default:
                if (isSplitPanelOpen()) closeSplitView();
                else {
                    const mainId = SelectedChannelStore.getChannelId();
                    const ch = mainId ? ChannelStore.getChannel(mainId) : null;
                    if (ch) openInSplitView(ch.guild_id ?? null, ch.id);
                }
                break;
        }

        sendBotMessage(ctx.channel.id, { content: statusText() });
    },
}];
