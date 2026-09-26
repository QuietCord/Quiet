/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

export function SwapChannelsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg aria-hidden viewBox="0 0 24 24" width={18} height={18} fill="currentColor" {...props}>
            <path d="M2.3 7.7a1 1 0 0 1 0-1.4l4-4a1 1 0 0 1 1.4 1.4L5.42 6H21a1 1 0 1 1 0 2H5.41l2.3 2.3a1 1 0 1 1-1.42 1.4l-4-4ZM17.7 21.7l4-4a1 1 0 0 0 0-1.4l-4-4a1 1 0 0 0-1.4 1.4l2.29 2.3H3a1 1 0 1 0 0 2h15.59l-2.3 2.3a1 1 0 0 0 1.42 1.4Z" />
        </svg>
    );
}

export function PinIcon(props: React.SVGProps<SVGSVGElement> & { active?: boolean; }) {
    const { active, ...rest } = props;
    return (
        <svg aria-hidden viewBox="0 0 24 24" width={18} height={18} fill={active ? "var(--brand-experiment)" : "currentColor"} {...rest}>
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2Z" />
        </svg>
    );
}

export function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg aria-hidden viewBox="0 0 24 24" width={18} height={18} fill="currentColor" {...props}>
            <path d="M18.4 4 12 10.4 5.6 4 4 5.6l6.4 6.4L4 18.4 5.6 20l6.4-6.4 6.4 6.4 1.6-1.6-6.4-6.4L20 5.6 18.4 4Z" />
        </svg>
    );
}
