/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { logoDataUrl } from "@shared/brandAssets";
import { classNameFactory } from "@utils/css";
import { IconProps } from "@utils/types";

import "./QuietHubHomeIcon.css";

const cl = classNameFactory("vc-quiet-hub-home-icon-");

/** Pixel casita framing the Quiet cat logo (Hub sidebar + hero). */
export function QuietHubHomeIcon({ width = 24, height = 24, className }: IconProps) {
    return (
        <span
            className={cl("wrap", className)}
            style={{ width, height }}
            aria-hidden
        >
            <svg
                className={cl("house")}
                viewBox="0 0 32 32"
                width={width}
                height={height}
                xmlns="http://www.w3.org/2000/svg"
                shapeRendering="crispEdges"
            >
                <path fill="#6B4E3D" d="M2 15h28v1H2z" />
                <path fill="#A67C52" d="M4 14L16 5l12 9v1H4z" />
                <path fill="#C9A66B" d="M6 15h20v13H6z" />
                <path fill="#8B6914" d="M6 15h2v13H6zm18 0h2v13h-2z" />
                <rect fill="#5C4033" x="11" y="19" width="10" height="9" />
                <rect fill="#3D2914" x="13" y="21" width="6" height="7" />
                <rect fill="#E8B4B8" x="22" y="18" width="3" height="3" />
                <rect fill="#87CEEB" x="22" y="18" width="3" height="2" opacity="0.85" />
                <rect fill="#5C4033" x="7" y="18" width="3" height="3" />
                <rect fill="#87CEEB" x="7" y="18" width="3" height="2" opacity="0.85" />
                <rect fill="#4A3728" x="6" y="27" width="20" height="1" />
            </svg>
            <img className={cl("cat")} src={logoDataUrl} alt="" draggable={false} />
        </span>
    );
}
