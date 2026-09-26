/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import {
    processProfileBadges,
    QUIET_DEFAULT_HIDDEN_DISCORD_BADGE_IDS,
    sanitizeUserProfileBadges,
} from "@shared/quietProfileBadges";
import definePlugin from "@utils/types";
import type { ProfileBadge } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

import { getQuietProfileBadgeOptions, settings } from "./settings";

export { settings } from "./settings";

/** Discord experiment 2026-08-badge-management (when present in client) */
const ProfileBadgeVisibility = findByPropsLazy("hiddenProfileBadgeIds");

function onProfileEvent(data: { userProfile?: { badges?: ProfileBadge[]; }; }) {
    if (data?.userProfile) sanitizeUserProfileBadges(data.userProfile, getQuietProfileBadgeOptions());
}

export default definePlugin({
    name: "QuietProfileUi",
    description: "Hide Discord Quest / Orbs badges, reorder Quiet contributor badge",
    tags: ["Quiet", "Appearance"],
    authors: [{ name: "hyusband", id: 0n }],
    enabledByDefault: true,
    settings,

    settingsAboutComponent: () => (
        <span>
            Official hide toggles: enable the Experiments plugin, open{" "}
            <code>dev://experiment/2026-08-badge-management</code> when Discord assigns you the rollout.
            Quiet already hides Quest ({QUIET_DEFAULT_HIDDEN_DISCORD_BADGE_IDS[0]}) and Orbs (
            {QUIET_DEFAULT_HIDDEN_DISCORD_BADGE_IDS[1]}) locally.
        </span>
    ),

    patches: [
        {
            find: "UserProfileStore",
            replacement: {
                match: /(?<=getUserProfile\(\i\){return )(.+?)(?=})/,
                replace: "$self.sanitizeProfile($1)"
            }
        },
    ],

    start() {
        FluxDispatcher.subscribe("USER_PROFILE_FETCH_SUCCESS", onProfileEvent);
        FluxDispatcher.subscribe("USER_PROFILE_UPDATE", onProfileEvent);
    },

    stop() {
        FluxDispatcher.unsubscribe("USER_PROFILE_FETCH_SUCCESS", onProfileEvent);
        FluxDispatcher.unsubscribe("USER_PROFILE_UPDATE", onProfileEvent);
    },

    sanitizeProfile<T extends { badges?: ProfileBadge[]; } | null | undefined>(profile: T): T {
        if (!profile?.badges?.length) return profile;
        return sanitizeUserProfileBadges(profile, getQuietProfileBadgeOptions()) ?? profile;
    },

    filterProfileBadges(badges: ProfileBadge[]) {
        if (!Array.isArray(badges)) return badges;

        let list = processProfileBadges(badges, getQuietProfileBadgeOptions());

        try {
            const isHidden = (ProfileBadgeVisibility as { isBadgeHidden?: (id: string) => boolean; })?.isBadgeHidden;
            if (typeof isHidden === "function") {
                list = list.filter(b => !isHidden(b.id));
            }
        } catch {
            // experiment module not shipped yet
        }

        return list;
    },
});
