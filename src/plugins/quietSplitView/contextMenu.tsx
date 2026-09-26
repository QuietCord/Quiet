/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ChannelType } from "@vencord/discord-types/enums";
import type { Channel, User } from "@vencord/discord-types";
import { ChannelStore, Menu, PermissionsBits, PermissionStore, UserStore } from "@webpack/common";

import { closeSplitView, getSplitPanelState, openInSplitView } from "./splitStore";

function sideHasChannel(channelId: string | null | undefined) {
    if (!channelId) return false;
    return getSplitPanelState().channelId === channelId;
}

function menuItem(id: string, label: string, action: () => void) {
    return <Menu.MenuItem id={id} label={label} action={action} />;
}

export const channelContextPatch: NavContextMenuPatchCallback = (children, args: { channel: Channel; }) => {
    const channel = args.channel;
    const ok = channel
        && channel.type !== ChannelType.GUILD_CATEGORY
        && channel.type !== ChannelType.GUILD_VOICE
        && channel.type !== ChannelType.GUILD_STAGE_VOICE
        && (PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) || channel.type === ChannelType.GROUP_DM);
    if (!ok) return;

    const onSide = sideHasChannel(channel.id);
    children.push(menuItem(
        "vc-quiet-split-channel",
        onSide ? "Close Quiet Sideview" : "Open in Quiet Sideview",
        () => {
            if (onSide) closeSplitView();
            else openInSplitView(channel.guild_id ?? null, channel.id);
        },
    ));
};

export const userContextPatch: NavContextMenuPatchCallback = (children, args: { user: User; }) => {
    if (!args.user || args.user.id === UserStore.getCurrentUser().id) return;
    const dmId = ChannelStore.getDMFromUserId?.(args.user.id) ?? null;
    const onSide = sideHasChannel(dmId);

    children.push(menuItem(
        "vc-quiet-split-user",
        onSide ? "Close Quiet Sideview" : "Open in Quiet Sideview",
        () => {
            if (onSide) closeSplitView();
            else openInSplitView(null, args.user.id);
        },
    ));
};
