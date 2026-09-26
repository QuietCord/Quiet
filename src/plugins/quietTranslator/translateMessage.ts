/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Message } from "@vencord/discord-types";
import { ChannelStore } from "@webpack/common";

import { translateIncoming } from "./engine";
import { getMessageContent } from "./messageContent";
import { showTranslation } from "./TranslationAccessory";

export async function translateMessage(message: Message) {
    const content = getMessageContent(message);
    if (!content) return;

    const channel = ChannelStore.getChannel(message.channel_id);
    const result = await translateIncoming(content, channel?.guild_id ?? null);
    showTranslation(message.id, result);
}
