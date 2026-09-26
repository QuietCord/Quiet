/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** User-facing product name in Discord settings and notifications */
export const CLIENT_NAME = "Quiet";

/** Upstream project (keep for GPL attribution and merges) */
export const UPSTREAM_NAME = "Vencord";
export const UPSTREAM_REPO = "Vendicated/Vencord";

/** This fork's GitHub `owner/repo` (client) */
export const FORK_REPO = "QuietCord/Quiet";

/** QuietCord GitHub org */
export const GITHUB_ORG = "QuietCord";
export const GITHUB_ORG_URL = "https://github.com/QuietCord";

/** Backend repo for cloud sync (AGPL fork of Vencord/Backend) */
export const BACKEND_REPO = "QuietCord/Backend";

/** Cloud sync API base URL (must implement Vencord Backend-compatible routes). */
export const CLOUD_API_URL = "https://backend-285bb.containers.snapdeploy.app/";

/** Donor badge JSON; leave empty until you host badges.json */
export const BADGES_JSON_URL = "";

/** Pixel-art cat-in-box logo — see assets/brand/ */
export const CLIENT_LOGO_SOURCE = "";
export const CLIENT_FAVICON_SOURCE = "";

/** QuietPresence: Rich Presence asset key in your Discord app (upload logo.png as this key) */
export const QUIET_RPC_DEFAULT_IMAGE_KEY = "quiet";

/**
 * Optional Discord Application ID for QuietPresence (register once in the Developer Portal,
 * upload logo as QUIET_RPC_DEFAULT_IMAGE_KEY). When set, users need not paste an App ID.
 * Leave empty to use text-only presence (no portal) until you add an ID here.
 */
export const QUIET_RPC_APP_ID = "1553407390182019282";

/** Default clone path for smart dev overlay (override with env QUIET_REPO_PATH). */
export const QUIET_DEV_REPO_PATH = "C:/Projects/Quiet";

/** Public site for Quiet (optional). Logo artwork originates from Catbox. */
export const WEBSITE_URL = "";
export const PLUGIN_DOCS_BASE = "";
export const CLOUD_PRIVACY_URL = "";
export const CLOUD_BACKEND_SOURCE_URL = `https://github.com/${BACKEND_REPO}`;

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
