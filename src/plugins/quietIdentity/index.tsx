/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { BrandLogoIcon } from "@components/BrandLogoIcon";
import ErrorBoundary from "@components/ErrorBoundary";
import { CLIENT_NAME } from "@shared/brand";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { UserStore } from "@webpack/common";

import { settings } from "./settings";

function isOwnMessage(message: Message | undefined) {
    const me = UserStore.getCurrentUser()?.id;
    if (!me || !message?.author) return false;
    if (message.author.bot || message.author.system) return false;
    return message.author.id === me;
}

function QuietIdentityAccessory({ message }: { message: Message; }) {
    const { showFooter, showLogo, footerText } = settings.use(["showFooter", "showLogo", "footerText"]);

    if (!showFooter || !isOwnMessage(message)) return null;

    const label = footerText.trim() || `via ${CLIENT_NAME}`;

    return (
        <span className="vc-quiet-identity-accessory" aria-hidden>
            {showLogo && (
                <BrandLogoIcon width={14} height={14} className="vc-quiet-identity-icon" />
            )}
            <span>{label}</span>
        </span>
    );
}

export { settings } from "./settings";

export default definePlugin({
    name: "QuietIdentity",
    description: `Shows a discreet footer on your messages with the ${CLIENT_NAME} cat (client-only)`,
    tags: ["Quiet", "Chat", "Appearance"],
    authors: [{ name: "hyusband", id: 0n }],
    enabledByDefault: true,
    dependencies: ["MessageAccessoriesAPI"],

    settings,

    renderMessageAccessory: props => (
        <ErrorBoundary noop>
            <QuietIdentityAccessory message={props.message} />
        </ErrorBoundary>
    ),
});
