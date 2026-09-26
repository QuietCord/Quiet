/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import ErrorBoundary from "@components/ErrorBoundary";
import { Tooltip } from "@webpack/common";
import { useEffect, useState } from "@webpack/common";

import { getFocusSession, remainingMs, subscribeFocusSession, toggleFocus } from "./focusState";
import { FocusMoonGlyph } from "./FocusMoonIcon";
import { settings } from "./settings";

function formatRemaining(ms: number | null) {
    if (ms == null) return "";
    const min = Math.ceil(ms / 60_000);
    return min < 60 ? `${min}m` : `${Math.floor(min / 60)}h${min % 60}m`;
}

export const FocusChatBarButton: ChatBarButtonFactory = ErrorBoundary.wrap(function FocusChatBarButton({ isMainChat }) {
    const [session, setSession] = useState(getFocusSession);

    useEffect(() => subscribeFocusSession(() => setSession(getFocusSession())), []);

    if (!isMainChat || !settings.store.showChatBarButton) return null;

    const tip = session.active
        ? `Focus on${session.dmsAndMentions ? " (DMs + mentions)" : ""}${formatRemaining(remainingMs()) ? ` · ${formatRemaining(remainingMs())}` : ""} — click to end`
        : "Focus Mode — minimal Discord UI";

    return (
        <Tooltip text={tip}>
            {tooltipProps => (
                <ChatBarButton
                    {...tooltipProps}
                    onClick={() => toggleFocus()}
                    buttonProps={{
                        "aria-pressed": session.active,
                        style: session.active ? { color: "var(--brand-experiment)" } : undefined,
                    }}
                >
                    <FocusMoonGlyph active={session.active} />
                </ChatBarButton>
            )}
        </Tooltip>
    );
}, { noop: true });
