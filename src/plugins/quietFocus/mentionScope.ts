/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelType } from "@vencord/discord-types/enums";
import { ChannelRouter, ChannelStore, NavigationRouter, ReadStateStore } from "@webpack/common";

import { getFocusSession } from "./focusState";

function isDmLike(channelId: string) {
    const ch = ChannelStore.getChannel(channelId);
    if (!ch) return false;
    return ch.type === ChannelType.DM || ch.type === ChannelType.GROUP_DM;
}

function channelAllowedInMentionMode(channelId: string) {
    if (!channelId) return true;
    if (isDmLike(channelId)) return true;
    return ReadStateStore.getMentionCount(channelId) > 0;
}

/** Keep user inside DMs + @mention channels while Focus mention mode is active. */
export function enforceMentionScope(channelId: string | undefined) {
    const session = getFocusSession();
    if (!session.active || !session.dmsAndMentions || !channelId) return;
    if (channelAllowedInMentionMode(channelId)) return;

    const mentionIds = ReadStateStore.getMentionChannelIds().filter(
        id => ReadStateStore.getMentionCount(id) > 0,
    );

    if (mentionIds.length > 0) {
        ChannelRouter.transitionToChannel(mentionIds[0]);
        return;
    }

    NavigationRouter.transitionToGuild("@me");
}
