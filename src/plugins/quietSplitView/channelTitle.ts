/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Channel } from "@vencord/discord-types";
import { RelationshipStore, UserStore } from "@webpack/common";

export function getSplitChannelTitle(channel: Channel | null | undefined) {
    if (!channel) return "Chat";

    if (channel.isPrivate()) {
        const recipientId = channel.getRecipientId?.();
        if (!channel.name && recipientId) {
            const user = UserStore.getUser(recipientId);
            if (user) {
                return RelationshipStore.getNickname(recipientId) || user.globalName || user.username || "DM";
            }
        }
        return channel.name || "DM";
    }

    return channel.name || "Chat";
}
