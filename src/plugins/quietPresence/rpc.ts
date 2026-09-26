/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isTruthy } from "@utils/guards";
import { Activity } from "@vencord/discord-types";
import { ActivityType } from "@vencord/discord-types/enums";
import { QUIET_RPC_APP_ID } from "@shared/brand";
import { Logger } from "@utils/Logger";
import { ApplicationAssetUtils, FluxDispatcher, showToast, Toasts } from "@webpack/common";

import {
    DEFAULT_APP_NAME,
    DEFAULT_BUTTON_LABEL,
    DEFAULT_BUTTON_URL,
    DEFAULT_IMAGE_KEY,
} from "./defaults";
import { getCurrentRotationLine } from "./rotation";
import { getPresenceSessionStart } from "./rotationTimer";
import { settings, TimestampMode } from "./settings";

const SOCKET_ID = "QuietPresence";
const logger = new Logger("QuietPresence");

let assetWarnShown = false;

/** Same entry point Discord uses for local RPC; injection does not bypass gateway validation. */
function resolveApplicationId(userAppId?: string): string | null {
    const fromUser = userAppId?.trim();
    if (fromUser && /^\d{16,21}$/.test(fromUser)) return fromUser;

    const bundled = QUIET_RPC_APP_ID.trim();
    if (bundled && /^\d{16,21}$/.test(bundled)) return bundled;

    // CustomRPC-style fallback: text/buttons only, no Rich Presence art assets
    if (!fromUser && !bundled) return "0";

    return null;
}

async function getApplicationAsset(appID: string, key: string): Promise<string | undefined> {
    try {
        return (await ApplicationAssetUtils.fetchAssetIds(appID, [key]))[0];
    } catch (err) {
        logger.warn(`Could not load asset "${key}" for application ${appID}.`, err);
        if (!assetWarnShown) {
            assetWarnShown = true;
            showToast(
                "Quiet Presence: art asset missing in Developer Portal (key \"quiet\", 512×512). Text activity still applies if sharing is on.",
                Toasts.Type.MESSAGE,
            );
        }
        return undefined;
    }
}

export function applyQuietPresenceDefaults() {
    const s = settings.store;
    if (!s.appName) s.appName = DEFAULT_APP_NAME;
    if (s.type == null) s.type = ActivityType.PLAYING;
    if (s.timestampMode == null) s.timestampMode = TimestampMode.NOW;
    const resolvedId = resolveApplicationId(s.appID);
    if (resolvedId && resolvedId !== "0" && !s.imageBig) s.imageBig = DEFAULT_IMAGE_KEY;
    if (!s.imageBigTooltip) s.imageBigTooltip = DEFAULT_APP_NAME;
    if (!s.buttonOneText) s.buttonOneText = DEFAULT_BUTTON_LABEL;
    if (!s.buttonOneURL) s.buttonOneURL = DEFAULT_BUTTON_URL;
}

function resolveDetailsState() {
    if (settings.store.rotateEnabled !== false) {
        const line = getCurrentRotationLine();
        return {
            details: line.details,
            state: line.state,
            imageBigTooltip: line.imageBigTooltip ?? settings.store.imageBigTooltip,
        };
    }
    return {
        details: settings.store.details || getCurrentRotationLine().details,
        state: settings.store.state || getCurrentRotationLine().state,
        imageBigTooltip: settings.store.imageBigTooltip,
    };
}

export async function createQuietActivity(): Promise<Activity | undefined> {
    applyQuietPresenceDefaults();

    const {
        appID,
        appName,
        type,
        streamLink,
        startTime,
        endTime,
        imageBig,
        imageSmall,
        imageSmallTooltip,
        buttonOneText,
        buttonOneURL,
        buttonTwoText,
        buttonTwoURL,
        timestampMode,
    } = settings.store;

    const { details, state, imageBigTooltip } = resolveDetailsState();

    const applicationId = resolveApplicationId(appID);
    if (!appName || applicationId == null) return;

    const activity: Activity = {
        application_id: applicationId,
        name: appName,
        state,
        details,
        type: type ?? ActivityType.PLAYING,
        flags: 1 << 0,
    };

    if (type === ActivityType.STREAMING) activity.url = streamLink;

    switch (timestampMode) {
        case TimestampMode.NOW:
            activity.timestamps = { start: getPresenceSessionStart() };
            break;
        case TimestampMode.TIME:
            activity.timestamps = {
                start: Date.now() - (new Date().getHours() * 3600 + new Date().getMinutes() * 60 + new Date().getSeconds()) * 1000,
            };
            break;
        case TimestampMode.CUSTOM:
            if (startTime || endTime) {
                activity.timestamps = {};
                if (startTime) activity.timestamps.start = startTime;
                if (endTime) activity.timestamps.end = endTime;
            }
            break;
        case TimestampMode.NONE:
        default:
            break;
    }

    if (buttonOneText) {
        activity.buttons = [buttonOneText, buttonTwoText].filter(isTruthy);
        activity.metadata = {
            button_urls: [buttonOneURL, buttonTwoURL].filter(isTruthy),
        };
    }

    if (applicationId !== "0" && imageBig) {
        const large_image = await getApplicationAsset(applicationId, imageBig);
        if (large_image) {
            activity.assets = {
                large_image,
                large_text: imageBigTooltip || undefined,
            };
        }
    }

    if (applicationId !== "0" && imageSmall) {
        const small_image = await getApplicationAsset(applicationId, imageSmall);
        if (small_image) {
            activity.assets = {
                ...activity.assets,
                small_image,
                small_text: imageSmallTooltip || undefined,
            };
        }
    }

    for (const k in activity) {
        if (k === "type") continue;
        const v = activity[k as keyof Activity];
        if (v == null || (typeof v === "string" && v.length === 0)) delete activity[k as keyof Activity];
    }

    return activity;
}

export async function setQuietPresence(disable?: boolean) {
    try {
        const activity = disable ? undefined : await createQuietActivity();

        FluxDispatcher.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: activity ?? null,
            socketId: SOCKET_ID,
        });
    } catch (err) {
        logger.error("Failed to set presence", err);
    }
}
