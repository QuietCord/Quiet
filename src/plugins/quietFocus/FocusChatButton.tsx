/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import ErrorBoundary from "@components/ErrorBoundary";
import { Tooltip } from "@webpack/common";
import { useEffect, useState } from "@webpack/common";

import { getFocusSession, remainingMs, subscribeFocusSession, toggleFocus } from "./focusState";
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
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                        <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8Zm.5-13H11v6l5.25 3.15.75-1.23-4-2.37V7Z" />
                    </svg>
                </ChatBarButton>
            )}
        </Tooltip>
    );
}, { noop: true });
