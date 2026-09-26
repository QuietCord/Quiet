/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { IconComponent } from "@utils/types";

export const QuietTranslateIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className} aria-hidden>
        <path
            fill="currentColor"
            d="m5 20 2.75-7.5h3.5L14 20h-2.1l-.95-2.55H8.05L7.1 20H5Zm4.15-4.2 1.15-3.1h.05l1.1 3.1H9.15ZM14 20v-1.65l5.5-5.55V11.5L14 6V4.35h7v1.65l-5.5 5.55V14L21 19.35V21h-7Z"
        />
    </svg>
);
