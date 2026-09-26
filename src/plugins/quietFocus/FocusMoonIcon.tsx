/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Moon glyph via CSS mask so it always paints in the guild list button. */
export function FocusMoonGlyph({ active = false }: { active?: boolean; }) {
    return (
        <span
            className={active ? "vc-focus-moon-glyph vc-focus-moon-glyph-active" : "vc-focus-moon-glyph"}
            aria-hidden
        />
    );
}
