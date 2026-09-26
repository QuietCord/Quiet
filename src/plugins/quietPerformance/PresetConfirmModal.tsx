/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Forms } from "@webpack/common";

import { getPresetRiskLines, type PresetRiskTier } from "./presetRisk";
import type { PerformanceProfile } from "./presets";

function tierPrefix(tier: PresetRiskTier) {
    switch (tier) {
        case "safe": return "✓";
        case "caution": return "!";
        case "risky": return "⚠";
        case "experimental": return "⚠ exp";
    }
}

export function PresetConfirmModal({
    profile,
    onConfirm,
    onClose,
    transitionState,
}: {
    profile: PerformanceProfile;
    onConfirm: () => void;
    onClose: () => void;
    transitionState: number;
}) {
    const lines = getPresetRiskLines(profile);

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Forms.FormTitle tag="h3">Apply {profile} preset?</Forms.FormTitle>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Forms.FormText className="vc-quiet-perf-risk-muted">
                    This preset changes performance policies. Review tradeoffs before continuing.
                </Forms.FormText>
                <ul className="vc-quiet-perf-preset-list">
                    {lines.map(line => (
                        <li key={line.label} className={`vc-quiet-perf-preset-line vc-quiet-perf-preset-${line.tier}`}>
                            <span>{tierPrefix(line.tier)}</span> {line.label}
                        </li>
                    ))}
                </ul>
                {profile === "minimal" && (
                    <Forms.FormText className="vc-quiet-perf-risk-warn">
                        Minimum prioritizes RAM/CPU over full Discord functionality. Some visual or secondary features may stop working.
                    </Forms.FormText>
                )}
            </ModalContent>
            <ModalFooter>
                <Button onClick={onClose} color={Button.Colors.TRANSPARENT}>Cancel</Button>
                <Button onClick={() => { onConfirm(); onClose(); }} color={Button.Colors.BRAND}>Apply preset</Button>
            </ModalFooter>
        </ModalRoot>
    );
}
