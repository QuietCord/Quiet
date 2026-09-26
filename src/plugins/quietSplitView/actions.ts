/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getCurrentChannel } from "@utils/discord";
import { ChannelRouter } from "@webpack/common";

import { openInSplitView, SplitStore } from "./splitStore";

/** Swap main chat and Quiet side panel channels. */
export function swapSplitWithMain() {
    const main = getCurrentChannel();
    const side = SplitStore.getState();
    if (!main?.id || !side.channelId) return;

    openInSplitView(main.guild_id ?? null, main.id, { pinned: side.pinned });
    ChannelRouter.transitionToChannel(side.channelId);
}
