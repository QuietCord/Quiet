/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Logger } from "@utils/Logger";

import { checkCloudUrlCsp, getCloudAuth, getCloudUrl } from "./cloudSetup";

const logger = new Logger("SettingsSync:Hooks", "#39b7e0");

export async function registerReleaseHook(webhookUrl: string, email = "") {
    if (!await checkCloudUrlCsp()) return false;

    try {
        const res = await fetch(new URL("/v1/hooks/register", getCloudUrl()), {
            method: "POST",
            headers: {
                Authorization: await getCloudAuth(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                webhookUrl: webhookUrl.trim(),
                email: email.trim(),
                notifyReleases: true,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({})) as { error?: string; };
            showNotification({
                title: "Release notifications",
                body: err.error ?? `Registration failed (${res.status}).`,
                color: "var(--red-360)",
            });
            return false;
        }

        showNotification({
            title: "Release notifications",
            body: "You will be pinged when a new Quiet build lands on main.",
            noPersist: true,
        });
        return true;
    } catch (e) {
        logger.error("Hook register failed", e);
        return false;
    }
}

export async function unregisterReleaseHook() {
    if (!await checkCloudUrlCsp()) return false;

    try {
        const res = await fetch(new URL("/v1/hooks/register", getCloudUrl()), {
            method: "DELETE",
            headers: { Authorization: await getCloudAuth() },
        });

        return res.ok || res.status === 204;
    } catch (e) {
        logger.error("Hook unregister failed", e);
        return false;
    }
}
