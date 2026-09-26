/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import type { PluginNative } from "@utils/types";

import { setDevGitContext } from "./devOverlay";
import type { DevGitContext } from "./native";
import { restartPresenceRotation } from "./rotationTimer";
import { settings } from "./settings";

const logger = new Logger("QuietPresence");

let cachedContext: DevGitContext | null = null;

export function getCachedDevGitContext() {
    return cachedContext;
}

export async function initSmartDevOverlay() {
    if (typeof IS_DISCORD_DESKTOP === "undefined" || !IS_DISCORD_DESKTOP) return;

    try {
        const Native = VencordNative.pluginHelpers.QuietPresence as PluginNative<typeof import("./native")>;
        const ctx = await Native.getDevGitContext();
        cachedContext = ctx;
        setDevGitContext(ctx);

        if (ctx.active && settings.store.devOverlayAuto !== false && settings.store.devOverlayEnabled !== true) {
            settings.store.devOverlayEnabled = true;
            logger.info("Smart dev overlay enabled", ctx.branch ?? "QUIET_DEV");
            restartPresenceRotation();
        }
    } catch (err) {
        logger.debug("Smart dev overlay unavailable", err);
    }
}
