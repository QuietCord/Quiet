/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";

import { PresetConfirmModal } from "./PresetConfirmModal";
import type { PerformanceProfile } from "./presets";
import { withPresetApply } from "./presets";
import { applyPerformanceProfile } from "./settings";

export function openPresetConfirmModal(profile: PerformanceProfile) {
    openModal(modalProps => (
        <PresetConfirmModal
            {...modalProps}
            profile={profile}
            onConfirm={() => withPresetApply(() => applyPerformanceProfile(profile))}
        />
    ));
}
