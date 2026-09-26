/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { managedStyleRootNode } from "@api/Styles";
import { createAndAppendStyle } from "@utils/css";

import { hexToHSL } from "../clientTheme/utils/colorUtils";

/** Stone-900 — warm dark base for Visual Refresh neutral derivation */
const QUIET_DARK_BASE_HEX = "1c1917";

const VARS_STYLE_ID = "vc-quietTheme-vars";
const OVERRIDES_STYLE_ID = "vc-quietTheme-overrides";

const VISUAL_REFRESH_COLORS_VARIABLES_REGEX = /(--neutral-\d{1,3}?-hsl):.+?([\d.]+?)%;/g;

const ACCENT_OVERRIDES = `
.theme-dark, .theme-darker, .theme-midnight {
    --brand-experiment: #d97706;
    --brand-experiment-560: #f59e0b;
    --text-link: #f59e0b;
}`;

const styleCache = {
    [VARS_STYLE_ID]: null as HTMLStyleElement | null,
    [OVERRIDES_STYLE_ID]: null as HTMLStyleElement | null,
};

function getOrCreateStyle(styleId: typeof VARS_STYLE_ID | typeof OVERRIDES_STYLE_ID) {
    if (!styleCache[styleId]) {
        styleCache[styleId] = createAndAppendStyle(styleId, managedStyleRootNode);
    }
    return styleCache[styleId]!;
}

function setStyleCss(styleId: typeof VARS_STYLE_ID | typeof OVERRIDES_STYLE_ID, css: string) {
    getOrCreateStyle(styleId).textContent = css;
}

function themeRootVars(hex: string) {
    const { hue, saturation, lightness } = hexToHSL(hex);
    return `:root {
    --theme-h: ${hue};
    --theme-s: ${saturation}%;
    --theme-l: ${lightness}%;
}`;
}

async function getDiscordStyles(): Promise<string> {
    const styleLinkNodes = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
    const cssTexts = await Promise.all(Array.from(styleLinkNodes, async node => {
        if (!node.href) return null;
        try {
            return await fetch(node.href).then(res => res.text());
        } catch {
            return null;
        }
    }));
    return cssTexts.filter(Boolean).join("\n");
}

function generateNewColorVars(colorsLightness: Record<string, number>, baseLightness: number) {
    return Object.entries(colorsLightness).map(([colorVariableName, lightness]) => {
        const lightnessOffset = lightness - baseLightness;
        const plusOrMinus = lightnessOffset >= 0 ? "+" : "-";
        return `${colorVariableName}: var(--theme-h) var(--theme-s) calc(var(--theme-l) ${plusOrMinus} ${Math.abs(lightnessOffset).toFixed(2)}%);`;
    }).join("\n");
}

function buildNeutralOverrides(styles: string): string | null {
    const visualRefreshColorsLightness = {} as Record<string, number>;
    for (const [, colorVariableName, lightness] of styles.matchAll(VISUAL_REFRESH_COLORS_VARIABLES_REGEX)) {
        visualRefreshColorsLightness[colorVariableName] = parseFloat(lightness);
    }

    if (Object.keys(visualRefreshColorsLightness).length === 0) return null;

    const lightThemeBaseLightness = visualRefreshColorsLightness["--neutral-2-hsl"];
    const darkThemeBaseLightness = visualRefreshColorsLightness["--neutral-69-hsl"];
    if (lightThemeBaseLightness == null || darkThemeBaseLightness == null) return null;

    const darkVars = generateNewColorVars(visualRefreshColorsLightness, darkThemeBaseLightness);
    const darkBlocks = [".theme-dark", ".theme-darker", ".theme-midnight"].map(
        sel => `${sel} {\n${darkVars}\n}`
    );

    const lightBlock = `.theme-light {\n${generateNewColorVars(visualRefreshColorsLightness, lightThemeBaseLightness)}\n}`;

    return [...darkBlocks, lightBlock].join("\n\n");
}

function applyAccentFallback() {
    setStyleCss(VARS_STYLE_ID, themeRootVars(QUIET_DARK_BASE_HEX));
    setStyleCss(OVERRIDES_STYLE_ID, ACCENT_OVERRIDES);
}

export async function applyQuietVisualRefresh(attempt = 0): Promise<void> {
    const styles = await getDiscordStyles();
    const neutralOverrides = buildNeutralOverrides(styles);

    if (!neutralOverrides) {
        if (attempt < 4) {
            await new Promise<void>(r => setTimeout(r, 800 + attempt * 400));
            return applyQuietVisualRefresh(attempt + 1);
        }
        console.warn("[QuietTheme] Visual Refresh neutrals not found — accent-only fallback");
        applyAccentFallback();
        return;
    }

    setStyleCss(VARS_STYLE_ID, themeRootVars(QUIET_DARK_BASE_HEX));
    setStyleCss(OVERRIDES_STYLE_ID, `${neutralOverrides}\n\n${ACCENT_OVERRIDES}`);
}

export function disableQuietVisualRefresh() {
    for (const id of [VARS_STYLE_ID, OVERRIDES_STYLE_ID] as const) {
        styleCache[id]?.remove();
        styleCache[id] = null;
    }
}
