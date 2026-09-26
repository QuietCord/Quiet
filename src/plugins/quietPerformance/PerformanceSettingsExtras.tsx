/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Forms } from "@webpack/common";
import { useEffect, useState } from "@webpack/common";

import { ExpandableFeatureDetail } from "./ExpandableFeatureDetail";
import { syncAdaptiveEngine, getPluginCostReport } from "./engine/index";
import { getAutoDisabledOptimizations, getCrashAttributionLog } from "./engine/optimizationSafety";
import { disableAllExperimentalOptimizations, getExperimentalEnabledKeys, restoreRecommendedPerformanceSettings } from "./engine/safety";
import { settings } from "./settings";

const EXPERIMENTAL_META_KEYS = [
    "channelLayoutCoalesce",
    "batchTypingUpdates",
    "memoryPressureController",
    "mediaVisibleOnly",
    "reactMemoHotPath",
    "lifecycleDebug",
] as const;

const REFERENCE_META_KEYS = [
    "adaptiveBackground",
    "messageCacheV2",
    "channelLayoutCoalesce",
    "batchTypingUpdates",
    "memoryPressureController",
    "mediaVisibleOnly",
    "reactMemoHotPath",
] as const;

export function PerformanceSettingsExtras() {
    const experimentalOn = getExperimentalEnabledKeys();
    const autoDisabled = getAutoDisabledOptimizations();
    const pluginReport = getPluginCostReport();
    const [crashLog, setCrashLog] = useState<Awaited<ReturnType<typeof getCrashAttributionLog>>>([]);

    useEffect(() => {
        void getCrashAttributionLog().then(setCrashLog);
    }, [autoDisabled.length]);

    return (
        <section className="vc-quiet-perf-settings-extras">
            <Forms.FormTitle tag="h5">Stage 3 — adaptive engine</Forms.FormTitle>
            <Forms.FormText className="vc-quiet-perf-risk-muted">
                Baseline calm ~852 MB / P95 13.5 ms · active server ~952 MB / P95 40 ms. Enable one experimental toggle, then use toolbox comparison (baseline → toggle ON → export comparison).
            </Forms.FormText>

            <Forms.FormTitle tag="h5" className="vc-quiet-perf-section-gap">Optimization reference</Forms.FormTitle>
            {REFERENCE_META_KEYS.map(key => (
                <ExpandableFeatureDetail key={key} metaKey={key} />
            ))}

            <Forms.FormTitle tag="h5" className="vc-quiet-perf-section-gap">Experimental</Forms.FormTitle>
            {EXPERIMENTAL_META_KEYS.map(key => (
                <ExpandableFeatureDetail key={`exp-${key}`} metaKey={key} />
            ))}

            {experimentalOn.length > 0 && (
                <Forms.FormText className="vc-quiet-perf-risk-warn">
                    Experimental active: {experimentalOn.join(", ")}
                </Forms.FormText>
            )}
            {autoDisabled.length > 0 && (
                <Forms.FormText className="vc-quiet-perf-risk-warn">
                    Auto-disabled after errors: {autoDisabled.join(", ")}
                </Forms.FormText>
            )}
            {crashLog.length > 0 && (
                <Forms.FormText className="vc-quiet-perf-risk-muted">
                    Crash attribution: {crashLog.slice(-3).map(e => `${e.feature} (${e.count}×, build ${e.discordBuild})`).join(" · ")}
                </Forms.FormText>
            )}

            {pluginReport.warnings.length > 0 && (
                <>
                    <Forms.FormTitle tag="h5" className="vc-quiet-perf-section-gap">Plugin cost (static)</Forms.FormTitle>
                    {pluginReport.warnings.map(w => (
                        <Forms.FormText key={w} className="vc-quiet-perf-risk-warn">{w}</Forms.FormText>
                    ))}
                </>
            )}

            <Forms.FormTitle tag="h5" className="vc-quiet-perf-section-gap">Recovery</Forms.FormTitle>
            <div className="vc-quiet-perf-recovery-row">
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.PRIMARY}
                    onClick={() => {
                        disableAllExperimentalOptimizations();
                        syncAdaptiveEngine();
                    }}
                >
                    Disable all experimental
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.BRAND}
                    onClick={() => {
                        restoreRecommendedPerformanceSettings();
                        syncAdaptiveEngine();
                    }}
                >
                    Restore recommended (Balanced)
                </Button>
            </div>

            {settings.store.profile === "minimal" && (
                <Forms.FormText className="vc-quiet-perf-risk-warn">
                    Minimum prioritizes RAM/CPU over full Discord visuals. Some media and secondary UI may not work as expected.
                </Forms.FormText>
            )}
        </section>
    );
}
