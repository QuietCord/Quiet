/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openQuietHubSettings } from "@components/settings/tabs/quiet/HubTab";
import { QuietHubHomeIcon } from "@components/QuietHubHomeIcon";
import definePlugin from "@utils/types";
import { Forms } from "@webpack/common";

export default definePlugin({
    name: "QuietHub",
    description: "Quiet control center — unified status and shortcuts for Focus, Performance, Split, and Cloud.",
    tags: ["Quiet", "Utility"],
    authors: [{ name: "hyusband", id: 0n }],
    enabledByDefault: true,

    settingsAboutComponent: () => (
        <Forms.FormText>
            Open <strong>Settings → Quiet Hub</strong> (casita icon). Dashboard only — no Discord patches.
        </Forms.FormText>
    ),

    toolboxActions: {
        "Quiet Hub"() {
            openQuietHubSettings();
        },
    },
});
