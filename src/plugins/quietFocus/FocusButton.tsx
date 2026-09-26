/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Tooltip } from "@webpack/common";
import { useEffect, useState } from "@webpack/common";

import { getFocusSession, remainingMs, startFocus, subscribeFocusSession, toggleFocus } from "./focusState";
import { FocusMoonGlyph } from "./FocusMoonIcon";
import { settings } from "./settings";

function formatRemaining(ms: number | null) {
    if (ms == null) return "until off";
    const min = Math.ceil(ms / 60_000);
    if (min < 60) return `${min}m left`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export const FocusModeButton = ErrorBoundary.wrap(function FocusModeButton() {
    const [session, setSession] = useState(getFocusSession);
    const [, setTick] = useState(0);

    useEffect(() => subscribeFocusSession(() => setSession(getFocusSession())), []);
    useEffect(() => {
        if (!session.active) return;
        const id = setInterval(() => setTick(t => t + 1), 30_000);
        return () => clearInterval(id);
    }, [session.active]);

    const active = session.active;
    const tip = active
        ? `Focus Mode on — ${formatRemaining(remainingMs())}. Click to end. Right-click: restart 1h.`
        : "Focus Mode — minimal UI until off. Right-click: timed DMs + @mentions.";

    return (
        <Tooltip text={tip}>
            {({ onMouseEnter, onMouseLeave }) => (
                <div
                    role="button"
                    tabIndex={0}
                    className="vc-focus-mode-button"
                    data-active={active ? "true" : "false"}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    onClick={() => toggleFocus()}
                    onContextMenu={e => {
                        e.preventDefault();
                        startFocus({
                            dmsAndMentions: true,
                            durationMin: settings.store.sessionDurationMin || 60,
                        });
                    }}
                    onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleFocus();
                        }
                    }}
                >
                    <FocusMoonGlyph active={active} />
                </div>
            )}
        </Tooltip>
    );
}, { noop: true });
