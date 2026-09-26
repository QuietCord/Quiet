/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";

export function isQuietPerformanceActive() {
    return isPluginEnabled("QuietPerformance");
}
