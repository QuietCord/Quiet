/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Activity } from "@vencord/discord-types";
import { ActivityType } from "@vencord/discord-types/enums";
import { CLIENT_NAME } from "@shared/brand";
import { AuthenticationStore, FluxDispatcher, PresenceStore } from "@webpack/common";

import { settings } from "./settings";

export interface DevOverlayLine {
    details: string;
    state: string;
}

/** Solo visible en tu cliente (perfil propio). No se envía a amigos. */
export const DEV_OVERLAY_LINES: DevOverlayLine[] = [
    { details: "Working on new features", state: "Quiet dev session" },
    { details: "Patching Discord PTB", state: "hyusband · local fork" },
    { details: "Webpack finds & plugins", state: "ship it when it's quiet" },
    { details: "Rotating presence logic", state: "this line is just for you" },
    { details: "Building something cool", state: `${CLIENT_NAME} on the grind` },
];

let devIndex = 0;
let devSessionStart = Date.now();
let origGetActivities: typeof PresenceStore.getActivities | null = null;

export function getDevOverlayLine() {
    return DEV_OVERLAY_LINES[devIndex % DEV_OVERLAY_LINES.length];
}

export function tickDevOverlay() {
    devIndex = (devIndex + 1) % DEV_OVERLAY_LINES.length;
    FluxDispatcher.dispatch({ type: "PRESENCE_UPDATES" });
}

export function resetDevOverlay() {
    devIndex = 0;
    devSessionStart = Date.now();
}

function buildDevOverlayActivity(): Activity {
    const { details, state } = getDevOverlayLine();
    return {
        application_id: "0",
        name: `${CLIENT_NAME} (dev)`,
        details,
        state,
        type: ActivityType.PLAYING,
        flags: 1 << 0,
        timestamps: { start: devSessionStart },
    };
}

export function installDevOverlayPatch() {
    if (origGetActivities) return;
    origGetActivities = PresenceStore.getActivities.bind(PresenceStore);
    PresenceStore.getActivities = (userId: string, guildId?: string) => {
        const activities = origGetActivities!(userId, guildId);
        if (settings.store.devOverlayEnabled !== true) return activities;
        if (userId !== AuthenticationStore.getId()) return activities;
        return [...activities, buildDevOverlayActivity()];
    };
}

export function uninstallDevOverlayPatch() {
    if (!origGetActivities) return;
    PresenceStore.getActivities = origGetActivities;
    origGetActivities = null;
}
