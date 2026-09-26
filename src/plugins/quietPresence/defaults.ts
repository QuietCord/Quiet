/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CLIENT_NAME, FORK_REPO, QUIET_RPC_DEFAULT_IMAGE_KEY } from "@shared/brand";

/** Discord Developer Portal → Rich Presence asset key for the cat logo */
export const DEFAULT_IMAGE_KEY = QUIET_RPC_DEFAULT_IMAGE_KEY;

export const DEFAULT_APP_NAME = CLIENT_NAME;

export const DEFAULT_DETAILS = "Personal Discord client";

export const DEFAULT_STATE = "via Quiet";

export const DEFAULT_BUTTON_LABEL = "GitHub";

export const DEFAULT_BUTTON_URL = `https://github.com/${FORK_REPO}`;

export const SETUP_STEPS = [
    `Create an application at discord.com/developers/applications`,
    `Rich Presence → Art Assets: upload assets/brand/discord-rich-presence.png (512×512) or discord-rich-presence-1024.png, key "${DEFAULT_IMAGE_KEY}"`,
    `Copy Application ID into Quiet Presence below`,
    `Enable Settings → Activity Privacy → Share my activity`,
];
