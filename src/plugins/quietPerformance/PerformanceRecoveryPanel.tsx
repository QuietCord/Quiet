/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Switch } from "@components/Switch";
import { openQuietHubSettings } from "@components/settings/tabs/quiet/HubTab";
import { Button, Forms, SelectedGuildStore, showToast, Toasts } from "@webpack/common";
import { useCallback, useEffect, useState } from "@webpack/common";

import {
    assessQuietRecovery,
    clearStage4Baseline,
    compareToStage4Baseline,
    formatComparisonSummary,
    rebaselineStage4,
    runQuietRecovery,
    type RecoveryAssessment,
} from "./engine/quietRecovery";
import { getPatchHealthDetail, logPatchHealth } from "./patchHealthReport";
import { settings } from "./settings";

function statusTone(assessment: RecoveryAssessment | null) {
    if (!assessment) return "muted";
    if (assessment.brokenPatchCount > 0) return "warn";
    if (assessment.buildDrift) return "info";
    if (assessment.needsAttention) return "info";
    return "ok";
}

export function PerformanceRecoveryPanel() {
    const [assessment, setAssessment] = useState<RecoveryAssessment | null>(null);
    const [patchDetail, setPatchDetail] = useState<ReturnType<typeof getPatchHealthDetail> | null>(null);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        setPatchDetail(getPatchHealthDetail("QuietPerformance"));
        setAssessment(await assessQuietRecovery());
    }, []);

    useEffect(() => {
        void refresh();
        const id = setInterval(() => void refresh(), 8000);
        return () => clearInterval(id);
    }, [refresh]);

    const tone = statusTone(assessment);

    return (
        <section className="vc-quiet-perf-settings-extras vc-quiet-recovery-panel">
            <Forms.FormTitle tag="h5">QuietRecovery &amp; patch health</Forms.FormTitle>
            <Forms.FormText className="vc-quiet-perf-risk-muted">
                Use after Discord updates or when optimizations feel unstable. Safe Mode keeps profiles and basic patches; AUTO/experimental Stage 4 features stay off until you re-baseline.
            </Forms.FormText>

            <div className={`vc-quiet-recovery-banner vc-quiet-recovery-banner--${tone}`}>
                <p className="vc-quiet-recovery-banner-title">
                    {assessment == null
                        ? "Checking patches…"
                        : assessment.brokenPatchCount > 0
                            ? `${assessment.brokenPatchCount} patch(es) need attention`
                            : assessment.buildDrift
                                ? "Discord build changed since baseline"
                                : "Patches OK on this build"}
                </p>
                {assessment && (
                    <p className="vc-quiet-recovery-banner-detail">
                        {assessment.appliedPatchCount}/{assessment.activePatchCount} applied · Discord build {assessment.discordBuild}
                        {assessment.baselineBuild != null && ` · baseline build ${assessment.baselineBuild}`}
                    </p>
                )}
            </div>

            {assessment?.reasons.length ? (
                <ul className="vc-quiet-recovery-reasons">
                    {assessment.reasons.map(r => (
                        <li key={r}>{r}</li>
                    ))}
                </ul>
            ) : null}

            <div className="vc-quiet-perf-recovery-row vc-quiet-recovery-switches">
                <Forms.FormText tag="span" style={{ flex: 1 }}>Safe Mode (force experimental/AUTO off)</Forms.FormText>
                <Switch
                    checked={settings.store.performanceSafeMode}
                    onChange={(v: boolean) => {
                        settings.store.performanceSafeMode = v;
                        void refresh();
                    }}
                />
            </div>

            <div className="vc-quiet-perf-recovery-row">
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    disabled={busy}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            await runQuietRecovery();
                            showToast("QuietRecovery: Safe Mode on · patch health logged", Toasts.Type.SUCCESS);
                            await refresh();
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    Run QuietRecovery
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.PRIMARY}
                    disabled={busy}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            const snap = await rebaselineStage4(SelectedGuildStore.getGuildId());
                            showToast(
                                `Stage 4 baseline saved (build ${snap.discordBuild})`,
                                Toasts.Type.SUCCESS,
                            );
                            await refresh();
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    Re-baseline Stage 4
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.BRAND}
                    disabled={busy || assessment?.baselineBuild == null}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            const report = await compareToStage4Baseline(SelectedGuildStore.getGuildId());
                            if (!report) {
                                showToast("Save a Stage 4 baseline first", Toasts.Type.MESSAGE);
                                return;
                            }
                            showToast(formatComparisonSummary(report), Toasts.Type.MESSAGE);
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    Compare to baseline
                </Button>
            </div>

            <div className="vc-quiet-perf-recovery-row">
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={busy || assessment?.baselineBuild == null}
                    onClick={async () => {
                        await clearStage4Baseline();
                        showToast("Stage 4 baseline cleared", Toasts.Type.SUCCESS);
                        await refresh();
                    }}
                >
                    Clear baseline
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={() => {
                        logPatchHealth();
                        void navigator.clipboard.writeText(JSON.stringify(getPatchHealthDetail(), null, 2));
                        showToast("Patch health JSON copied", Toasts.Type.SUCCESS);
                    }}
                >
                    Copy patch report
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.LINK}
                    onClick={() => openQuietHubSettings()}
                >
                    Open Quiet Hub
                </Button>
            </div>

            {patchDetail && (
                <>
                    <Forms.FormTitle tag="h5" className="vc-quiet-perf-section-gap">Webpack patches</Forms.FormTitle>
                    {patchDetail.labeledRows.length === 0
                        ? <Forms.FormText className="vc-quiet-perf-risk-muted">No patch health records yet.</Forms.FormText>
                        : patchDetail.labeledRows.map(row => (
                            <Forms.FormText
                                key={row.patchId}
                                className={row.status === "applied"
                                    ? "vc-quiet-recovery-patch-ok"
                                    : row.status === "skipped"
                                        ? "vc-quiet-perf-risk-muted"
                                        : "vc-quiet-recovery-patch-bad"}
                            >
                                {row.label}: {row.status}
                                {row.error ? ` — ${row.error}` : ""}
                                {row.skipReason ? ` (${row.skipReason})` : ""}
                            </Forms.FormText>
                        ))}
                </>
            )}
        </section>
    );
}
