/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelRouter } from "@webpack/common";

import { closeSplitView, SplitStore } from "./splitStore";

/** Move side channel to main and close the split panel. */
export function swapSplitWithMain() {
    const side = SplitStore.getState();
    if (!side.channelId) return;

    ChannelRouter.transitionToChannel(side.channelId);
    closeSplitView();
}
