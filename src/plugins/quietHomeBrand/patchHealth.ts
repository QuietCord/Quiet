/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { expectPatch } from "@shared/quietPatchHealth";

export const QUIET_HOME_BRAND_PATCH_IDS = [
    "home-brand-icon-discodo",
    "home-brand-icon-friends-list",
    "home-brand-dom-overlay",
] as const;

export const HOME_BRAND_DOM_PATCH_ID = "home-brand-dom-overlay";

for (const patchId of QUIET_HOME_BRAND_PATCH_IDS) {
    expectPatch(patchId, "QuietHomeBrand");
}
