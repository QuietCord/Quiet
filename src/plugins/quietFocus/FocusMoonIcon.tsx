/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Inline SVG — Discord CSP blocks data-URI CSS masks in the guild list. */
export function FocusMoonGlyph({ active = false }: { active?: boolean; }) {
    return (
        <svg
            className={active ? "vc-focus-moon-svg vc-focus-moon-active" : "vc-focus-moon-svg"}
            width={22}
            height={22}
            viewBox="0 0 24 24"
            aria-hidden
        >
            <path
                fill="currentColor"
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            />
        </svg>
    );
}
