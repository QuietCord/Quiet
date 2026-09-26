/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    hideQuestBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Hide the Discord Quests profile badge (quest_completed)",
    },
    hideOrbsBadge: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Hide the Orbs / leaf profile badge (orb_profile_badge)",
    },
    contributorAfterNitro: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Place the Quiet contributor badge right after your Nitro tenure badge",
    },
    noteBadgeManagementExperiment: {
        type: OptionType.COMPONENT,
        component: () => null,
        description:
            "Discord experiment dev://experiment/2026-08-badge-management will add official hide toggles. Quiet applies the Quest/Orbs hides client-side until then (and stays compatible after rollout).",
    },
});

export function getQuietProfileBadgeOptions() {
    const { hideQuestBadge, hideOrbsBadge, contributorAfterNitro } = settings.store;
    return {
        hideQuestBadge,
        hideOrbsBadge,
        reorderContributorAfterNitro: contributorAfterNitro,
    };
}
