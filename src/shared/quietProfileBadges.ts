/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ProfileBadge } from "@vencord/discord-types";

export const QUIET_CONTRIBUTOR_BADGE_ID = "quiet_contributor_badge";

/** Official Discord badge ids (XYZenix gist) */
export const DISCORD_QUEST_BADGE_ID = "quest_completed";
export const DISCORD_ORB_BADGE_ID = "orb_profile_badge";

export const DISCORD_QUEST_ICON = "7d9ae358c8c5e118768335dbe68b4fb8";
export const DISCORD_ORB_ICON = "83d8a1eb09a8d64e59233eec5d4d5c2d";

export interface QuietProfileBadgeOptions {
    hideQuestBadge: boolean;
    hideOrbsBadge: boolean;
    reorderContributorAfterNitro: boolean;
}

const QUEST_IDS = new Set([
    DISCORD_QUEST_BADGE_ID,
    "quest",
    "quests",
    "completed_quest",
    "discord_quests",
]);

const ORB_IDS = new Set([
    DISCORD_ORB_BADGE_ID,
    "orbs",
    "orbs_apprentice",
    "orb_apprentice",
    "orbs_apprentice_badge",
]);

function badgeHaystack(badge: ProfileBadge) {
    const extra = badge as ProfileBadge & { iconSrc?: string; };
    return [
        badge.id,
        badge.description,
        badge.icon,
        extra.iconSrc,
        badge.link,
    ].filter(Boolean).join(" ").toLowerCase();
}

export function isDiscordQuestBadge(badge: ProfileBadge) {
    const id = badge.id?.toLowerCase() ?? "";
    if (QUEST_IDS.has(id) || id.includes("quest")) return true;
    const text = badgeHaystack(badge);
    return text.includes(DISCORD_QUEST_ICON)
        || text.includes("completed a quest")
        || text.includes("discord quest");
}

export function isDiscordOrbBadge(badge: ProfileBadge) {
    const id = badge.id?.toLowerCase() ?? "";
    if (ORB_IDS.has(id) || id.startsWith("orb_") || id.includes("orb_profile")) return true;
    const text = badgeHaystack(badge);
    return text.includes(DISCORD_ORB_ICON)
        || text.includes("collected the orb")
        || text.includes("orbs apprentice")
        || text.includes("orbs — apprentice")
        || text.includes("orb profile badge");
}

export function isDiscordNitroTenureBadge(badge: ProfileBadge) {
    const id = badge.id?.toLowerCase() ?? "";
    if (id === "premium" || id.startsWith("premium_tenure")) return true;
    const desc = badge.description?.toLowerCase() ?? "";
    return desc.includes("subscriber since") || desc.includes("earned on");
}

export function reorderContributorAfterNitro(badges: ProfileBadge[]) {
    const idx = badges.findIndex(b => b.id === QUIET_CONTRIBUTOR_BADGE_ID);
    if (idx === -1) return badges;

    const next = badges.slice();
    const [contributor] = next.splice(idx, 1);

    let insertAfter = -1;
    for (let i = 0; i < next.length; i++) {
        if (isDiscordNitroTenureBadge(next[i])) insertAfter = i;
    }

    const insertAt = insertAfter === -1 ? next.length : insertAfter + 1;
    next.splice(insertAt, 0, contributor);
    return next;
}

export function processProfileBadges(
    badges: ProfileBadge[] | null | undefined,
    options: QuietProfileBadgeOptions,
) {
    if (!badges?.length) return badges ?? [];

    let list = badges;

    if (options.hideQuestBadge || options.hideOrbsBadge) {
        list = list.filter(b => {
            if (options.hideQuestBadge && isDiscordQuestBadge(b)) return false;
            if (options.hideOrbsBadge && isDiscordOrbBadge(b)) return false;
            return true;
        });
    }

    if (options.reorderContributorAfterNitro) {
        list = reorderContributorAfterNitro(list);
    }

    return list;
}

export function sanitizeUserProfileBadges<T extends { badges?: ProfileBadge[]; }>(
    profile: T | null | undefined,
    options: QuietProfileBadgeOptions,
): T | null | undefined {
    if (!profile?.badges?.length) return profile;
    profile.badges = processProfileBadges(profile.badges, options);
    return profile;
}

/** Badge ids QuietProfileUi hides by default (maps to future Discord badge management). */
export const QUIET_DEFAULT_HIDDEN_DISCORD_BADGE_IDS = [
    DISCORD_QUEST_BADGE_ID,
    DISCORD_ORB_BADGE_ID,
] as const;
