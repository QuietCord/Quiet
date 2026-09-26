/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GoogleLanguages } from "@plugins/translate/languages";
import { Forms, SelectedGuildStore, useStateFromStores } from "@webpack/common";

import { getTargetLanguageForGuild, setGuildTargetLanguage, settings } from "./settings";

const options = Object.entries(GoogleLanguages)
    .filter(([code]) => code !== "auto")
    .map(([value, label]) => ({ value, label }));

export function GuildLanguagePanel() {
    const guildId = useStateFromStores([SelectedGuildStore], () => SelectedGuildStore.getGuildId());
    const current = guildId ? getTargetLanguageForGuild(guildId) : settings.store.defaultReceivedLanguage;

    if (!guildId) {
        return <Forms.FormText className="vc-quiet-trans-muted">Open a server to set its translation language.</Forms.FormText>;
    }

    return (
        <Forms.FormSection title="Language for this server">
            <Forms.FormText className="vc-quiet-trans-muted">
                Incoming manual translations in this guild target this language (overrides global default).
            </Forms.FormText>
            <Forms.FormItem>
                <Forms.FormTitle>Server target language</Forms.FormTitle>
                <Forms.FormText>Select a language, then switch channels — setting saves for guild {guildId.slice(0, 8)}…</Forms.FormText>
                <select
                    className="vc-quiet-trans-select"
                    value={current}
                    onChange={e => setGuildTargetLanguage(guildId, e.target.value)}
                >
                    {options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </Forms.FormItem>
        </Forms.FormSection>
    );
}
