/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { ActivityType } from "@vencord/discord-types/enums";

import { QuietPresenceSettings } from "./QuietPresenceSettings";

export const enum TimestampMode {
    NONE,
    NOW,
    TIME,
    CUSTOM,
}

export const settings = definePluginSettings({
    rotateEnabled: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Rotate details and state on a timer",
    },
    rotateIntervalSec: {
        type: OptionType.NUMBER,
        default: 15,
        description: "Seconds between each message (5–120)",
    },
    devOverlayEnabled: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Extra dev activity on your profile — only on your screen, not sent to friends",
    },
    devOverlayAuto: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Auto-enable dev overlay when QUIET_DEV=1 or the Quiet repo is found (QUIET_REPO_PATH / brand path)",
    },
    config: {
        type: OptionType.COMPONENT,
        component: QuietPresenceSettings,
    },
}).withPrivateSettings<{
    appID?: string;
    appName?: string;
    details?: string;
    state?: string;
    type?: ActivityType;
    streamLink?: string;
    timestampMode?: TimestampMode;
    startTime?: number;
    endTime?: number;
    imageBig?: string;
    imageBigTooltip?: string;
    imageSmall?: string;
    imageSmallTooltip?: string;
    buttonOneText?: string;
    buttonOneURL?: string;
    buttonTwoText?: string;
    buttonTwoURL?: string;
}>();
