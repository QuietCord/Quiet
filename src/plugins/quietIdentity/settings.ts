/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    showFooter: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show a small footer under your messages (only on your screen)",
    },
    showLogo: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Include the Quiet cat icon in the footer",
    },
    footerText: {
        type: OptionType.STRING,
        default: "via Quiet",
        description: "Footer text next to the icon",
    },
});
