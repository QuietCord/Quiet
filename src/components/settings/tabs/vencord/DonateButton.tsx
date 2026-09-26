/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import DonateButton from "@components/settings/DonateButton";
import BadgeAPI from "@plugins/_api/badges";
import { DONOR_ROLE_ID, VENCORD_GUILD_ID } from "@utils/constants";
import { Button, GuildMemberStore } from "@webpack/common";

/** Financial supporter of QuietCord (docs/quiet-donors.json). */
export const isQuietDonor = (userId: string | undefined) =>
    !!userId && (BadgeAPI.getQuietDonorBadges(userId)?.length ?? 0) > 0;

/** Upstream Vencord donor badge or Vencord guild donor role (unchanged from upstream). */
export const isUpstreamDonor = (userId: string | undefined) => !!userId && (
    (BadgeAPI.getDonorBadges(userId)?.length ?? 0) > 0
    || GuildMemberStore?.getMember(VENCORD_GUILD_ID, userId)?.roles.includes(DONOR_ROLE_ID)
);

/** @deprecated Use isQuietDonor or isUpstreamDonor */
export const isDonor = isQuietDonor;

export function DonateButtonComponent() {
    return (
        <DonateButton
            look={Button.Looks.FILLED}
            color={Button.Colors.WHITE}
            style={{ marginTop: "1em" }}
        />
    );
}
