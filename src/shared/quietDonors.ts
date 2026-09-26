/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type QuietDonorBadgeEntry = {
    tooltip?: string;
    badge?: string;
};

export type QuietDonorsJson = Record<string, QuietDonorBadgeEntry[]>;

export const QUIET_DONOR_BADGE_ID_PREFIX = "quiet_donor_badge";
export const DEFAULT_QUIET_DONOR_TOOLTIP = "QuietCord Supporter";

export function parseQuietDonorsJson(raw: Record<string, unknown>): QuietDonorsJson {
    const out: QuietDonorsJson = {};
    for (const [key, value] of Object.entries(raw)) {
        if (key.startsWith("_")) continue;
        if (!Array.isArray(value)) continue;
        out[key] = value.filter(
            (entry): entry is QuietDonorBadgeEntry =>
                entry != null && typeof entry === "object"
        );
    }
    return out;
}

export function isQuietDonorUserId(map: QuietDonorsJson, userId: string | undefined): boolean {
    if (!userId) return false;
    return (map[userId]?.length ?? 0) > 0;
}
