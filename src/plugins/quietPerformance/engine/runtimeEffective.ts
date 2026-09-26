/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isQuietPerformanceActive } from "../active";
import type { AutoFeatureKey } from "./stage4/types";
import { getPerformanceControllerState } from "./stage4/performanceController";
import { resolveFeatureEnabled } from "./stage4/featureControl";

export function isRuntimeFeatureEnabled(feature: AutoFeatureKey) {
    if (!isQuietPerformanceActive()) return false;
    return resolveFeatureEnabled(feature, getPerformanceControllerState());
}
