/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getFocusSession } from "./focusState";
import { settings } from "./settings";

export function applyFocusOptionClasses() {
    const root = document.documentElement;
    const on = getFocusSession().active;
    root.classList.toggle("vc-focus-hide-members", on && settings.store.hideMemberList);
    root.classList.toggle("vc-focus-hide-activities", on && settings.store.hideActivities);
    root.classList.toggle("vc-focus-hide-promos", on && settings.store.hidePromos);
    root.classList.toggle("vc-focus-hide-decor", on && settings.store.hideDecorations);
    root.classList.toggle("vc-focus-hide-discover", on && settings.store.hideDiscover);
    root.classList.toggle("vc-focus-hide-banners", on && settings.store.hideBanners);
    root.classList.toggle("vc-focus-hide-muted", on && settings.store.hideMutedChannels);
}
