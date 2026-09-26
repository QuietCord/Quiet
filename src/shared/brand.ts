/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** User-facing product name in Discord settings and notifications */
export const CLIENT_NAME = "Quiet";

/** Upstream project (keep for GPL attribution and merges) */
export const UPSTREAM_NAME = "Vencord";
export const UPSTREAM_REPO = "Vendicated/Vencord";

/** This fork's GitHub `owner/repo` */
export const FORK_REPO = "hyusband/Quiet";

/** Cloud sync API base URL (must implement Vencord Backend-compatible routes). */
export const CLOUD_API_URL = "https://api.example.com/";

/** Donor badge JSON; leave empty until you host badges.json */
export const BADGES_JSON_URL = "";

export const PLUGIN_DOCS_BASE = "";
export const WEBSITE_URL = "";
export const CLOUD_PRIVACY_URL = "";
export const CLOUD_BACKEND_SOURCE_URL = "https://github.com/Vencord/Backend";

export function getCloudApiOrigin(): string {
    return new URL(CLOUD_API_URL).origin;
}

export function isTrustedCloudHost(host: string): boolean {
    try {
        return host === new URL(CLOUD_API_URL).host;
    } catch {
        return false;
    }
}

export function pluginDocsUrl(pluginName: string): string | null {
    if (!PLUGIN_DOCS_BASE) return null;
    return `${PLUGIN_DOCS_BASE.replace(/\/$/, "")}/${pluginName}`;
}
