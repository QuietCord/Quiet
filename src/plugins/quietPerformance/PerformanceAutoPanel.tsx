/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Forms } from "@webpack/common";

import { getActiveSamplingPlan } from "./engine/stage4/adaptiveSampling";
import { getFeatureTriState } from "./engine/stage4/featureControl";
import { getPerformanceControllerState, syncPerformanceController } from "./engine/stage4/performanceController";
import { resetGuildProfiles } from "./engine/stage4/guildWorkload";
import { settings } from "./settings";

const triLabel = (feature: string) => {
    const mode = getFeatureTriState(feature as "channelLayoutCoalesce");
    if (settings.store.autoPerformanceController && mode === "auto") return "AUTO";
    if (mode === "on") return "ON";
    if (mode === "off") return "OFF";
    return mode.toUpperCase();
};

export function PerformanceAutoPanel() {
    const state = getPerformanceControllerState();
    const sampling = getActiveSamplingPlan();

    return (
        <section className="vc-quiet-perf-settings-extras">
            <Forms.FormTitle tag="h5">Stage 4 — Auto performance</Forms.FormTitle>
            <Forms.FormText className="vc-quiet-perf-risk-muted">
                Auto mode adjusts experimental features from rolling metrics (8s cadence, hysteresis). Manual ON/OFF overrides always win. Nothing is sent off-device.
            </Forms.FormText>

            {settings.store.autoPerformanceController && state && (
                <>
                    <Forms.FormText>
                        <strong>Current mode:</strong> {state.mode.replace(/_/g, " ").toUpperCase()}
                        {state.pendingMode && state.pendingMode !== state.mode && (
                            <> → pending {state.pendingMode.replace(/_/g, " ")}</>
                        )}
                    </Forms.FormText>
                    {state.guildClass && (
                        <Forms.FormText><strong>Server class:</strong> {state.guildClass.toUpperCase()} (learned locally)</Forms.FormText>
                    )}
                    <Forms.FormText className="vc-quiet-perf-risk-muted">
                        Triggered by: {state.reasons.join(" · ")}
                    </Forms.FormText>
                    {state.activePolicies.length > 0 && (
                        <Forms.FormText>
                            <strong>Actions:</strong> {state.activePolicies.join(" · ")}
                        </Forms.FormText>
                    )}
                    {state.sample && (
                        <Forms.FormText className="vc-quiet-perf-risk-muted">
                            P95 {state.sample.frameP95Ms} ms · Flux {state.sample.fluxPerSec}/s · Layout {state.sample.layoutDimensionsPerSec}/s · RAM {state.sample.ramMb} MB
                        </Forms.FormText>
                    )}
                    <Forms.FormText className="vc-quiet-perf-risk-muted">
                        Sampling: {sampling.tier} (controller {sampling.controllerTickMs / 1000}s)
                    </Forms.FormText>
                </>
            )}

            <Forms.FormText className="vc-quiet-perf-section-gap">
                Channel layout: {triLabel("channelLayoutCoalesce")} · Typing batch: {triLabel("batchTypingUpdates")} · Memory: {triLabel("memoryPressureController")}
            </Forms.FormText>

            <div className="vc-quiet-perf-recovery-row">
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.PRIMARY}
                    onClick={() => {
                        void resetGuildProfiles();
                    }}
                >
                    Reset learned server profiles
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.BRAND}
                    onClick={() => syncPerformanceController()}
                >
                    Refresh auto controller
                </Button>
            </div>
        </section>
    );
}
