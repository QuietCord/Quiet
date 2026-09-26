/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Message } from "@vencord/discord-types";
import { Parser, useEffect, useState } from "@webpack/common";

import type { TranslationValue } from "./engine";
import { QuietTranslateIcon } from "./icons";

const setters = new Map<string, (v: TranslationValue | undefined) => void>();

export function showTranslation(messageId: string, value: TranslationValue) {
    setters.get(messageId)?.(value);
}

export function QuietTranslationAccessory({ message }: { message: Message; }) {
    const [translation, setTranslation] = useState<TranslationValue | undefined>();

    useEffect(() => {
        if ((message as { vencordEmbeddedBy?: unknown; }).vencordEmbeddedBy) return;
        setters.set(message.id, setTranslation);
        return () => void setters.delete(message.id);
    }, [message.id]);

    if (!translation) return null;

    return (
        <div className="vc-quiet-trans-block">
            <div className="vc-quiet-trans-label">
                <QuietTranslateIcon width={14} height={14} />
                <span>Translation</span>
            </div>
            <div className="vc-quiet-trans-text">{Parser.parse(translation.text)}</div>
            <div className="vc-quiet-trans-meta">
                From {translation.sourceLanguage}
                {" · "}
                <button type="button" className="vc-quiet-trans-dismiss" onClick={() => setTranslation(undefined)}>
                    Dismiss
                </button>
            </div>
        </div>
    );
}
