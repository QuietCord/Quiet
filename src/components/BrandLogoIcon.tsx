/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { logoDataUrl } from "@shared/brandAssets";
import { IconProps } from "@utils/types";

export function BrandLogoIcon({ width = 24, height = 24, className }: IconProps) {
    return (
        <img
            src={logoDataUrl}
            alt=""
            width={width}
            height={height}
            className={className}
            style={{ objectFit: "contain", display: "block", imageRendering: "pixelated" }}
        />
    );
}
