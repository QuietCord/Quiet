/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface RotationLine {
    /** First line under the app name (max 128 chars) */
    details: string;
    /** Second line (max 128 chars) */
    state: string;
    /** Optional hover text on large image */
    imageBigTooltip?: string;
}

/** Edit this list to change rotating presence copy (fork defaults). */
export const ROTATION_LINES: RotationLine[] = [
    { details: "Dev by hyusband", state: "Quiet · Discord PTB" },
    { details: "Personal Discord client", state: "via Quiet" },
    { details: "Fork of Vencord", state: "github.com/QuietCord/Quiet" },
    { details: "Modded with care", state: "hyusband on GitHub" },
    { details: "Cat in a box energy", state: "Rich Presence enabled" },
];

let rotationIndex = 0;

export function getCurrentRotationLine(): RotationLine {
    return ROTATION_LINES[rotationIndex % ROTATION_LINES.length];
}

export function tickRotation() {
    rotationIndex = (rotationIndex + 1) % ROTATION_LINES.length;
}

export function resetRotation() {
    rotationIndex = 0;
}
