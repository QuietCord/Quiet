/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { GoogleLanguages } from "@plugins/translate/languages";

import { GuildLanguagePanel } from "./GuildLanguagePanel";

const languageOptions = Object.entries(GoogleLanguages).map(([value, label]) => ({ value, label }));

export const settings = definePluginSettings({
    defaultReceivedLanguage: {
        type: OptionType.SELECT,
        description: "Default language for translating incoming messages (manual translate).",
        options: languageOptions,
        default: "en",
    },
    sentTargetLanguage: {
        type: OptionType.SELECT,
        description: "Target language when using translate before send.",
        options: languageOptions.filter(o => o.value !== "auto"),
        default: "en",
    },
    translateBeforeSend: {
        type: OptionType.BOOLEAN,
        description: "Translate your outgoing message before sending (chat bar button toggles).",
        default: false,
    },
    altClickTranslate: {
        type: OptionType.BOOLEAN,
        description: "Alt+click a message to translate it below the original.",
        default: true,
    },
    showMessagePopover: {
        type: OptionType.BOOLEAN,
        description: "Show Translate in the message hover toolbar.",
        default: true,
    },
    service: {
        type: OptionType.SELECT,
        description: IS_WEB ? "Translation provider (Google on web)" : "Translation provider",
        hidden: IS_WEB,
        options: [
            { label: "Google Translate", value: "google", default: true },
            { label: "DeepL Free — API key", value: "deepl" },
            { label: "DeepL Pro — API key", value: "deepl-pro" },
        ] as const,
    },
    deeplApiKey: {
        type: OptionType.STRING,
        displayName: "DeepL API key",
        description: "From deepl.com — only if using DeepL.",
        default: "",
    },
    guildTargetLanguages: {
        type: OptionType.CUSTOM,
        description: "Per-server target language overrides (guild id → language code).",
        default: {} as Record<string, string>,
        hidden: true,
    },
    guildLanguagePanel: {
        type: OptionType.COMPONENT,
        component: GuildLanguagePanel,
    },
}, {
    deeplApiKey: {
        hidden() {
            return this.store.service === "google";
        },
    },
});

export function getTargetLanguageForGuild(guildId: string | null | undefined) {
    if (guildId && settings.store.guildTargetLanguages[guildId]) {
        return settings.store.guildTargetLanguages[guildId];
    }
    return settings.store.defaultReceivedLanguage;
}

export function setGuildTargetLanguage(guildId: string, code: string) {
    settings.store.guildTargetLanguages = {
        ...settings.store.guildTargetLanguages,
        [guildId]: code,
    };
}
