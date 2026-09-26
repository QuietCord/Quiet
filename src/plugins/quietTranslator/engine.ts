/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DeeplLanguages, deeplLanguageToGoogleLanguage, GoogleLanguages } from "@plugins/translate/languages";
import { onlyOnce } from "@utils/onlyOnce";
import { PluginNative } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

import { getTargetLanguageForGuild, settings } from "./settings";

const Native = VencordNative.pluginHelpers.QuietTranslator as PluginNative<typeof import("./native")>;

export interface TranslationValue {
    sourceLanguage: string;
    text: string;
}

interface GoogleData {
    translation: string;
    sourceLanguage: string;
}

interface DeeplData {
    translations: {
        detected_source_language: string;
        text: string;
    }[];
}

const showDeeplQuota = onlyOnce(() =>
    showToast("DeepL quota exceeded — using Google", Toasts.Type.MESSAGE),
);

async function googleTranslate(text: string, sourceLang: string, targetLang: string): Promise<TranslationValue> {
    const url = `https://translate-pa.googleapis.com/v1/translate?${new URLSearchParams({
        "params.client": "gtx",
        dataTypes: "TRANSLATION",
        key: "AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA",
        "query.sourceLanguage": sourceLang,
        "query.targetLanguage": targetLang,
        "query.text": text,
    })}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google translate failed (${res.status})`);

    const { sourceLanguage, translation }: GoogleData = await res.json();
    return {
        sourceLanguage: GoogleLanguages[sourceLanguage as keyof typeof GoogleLanguages] ?? sourceLanguage,
        text: translation,
    };
}

async function deeplTranslate(text: string, targetLang: string): Promise<TranslationValue> {
    if (!settings.store.deeplApiKey) {
        showToast("DeepL API key missing — using Google", Toasts.Type.MESSAGE);
        return googleTranslate(text, "auto", deeplLanguageToGoogleLanguage(targetLang));
    }

    const { status, data } = await Native.makeDeeplTranslateRequest(
        settings.store.service === "deepl-pro",
        settings.store.deeplApiKey,
        JSON.stringify({ text: [text], target_lang: targetLang.split("-")[0].toUpperCase() }),
    );

    if (status === 456) {
        showDeeplQuota();
        return googleTranslate(text, "auto", deeplLanguageToGoogleLanguage(targetLang));
    }
    if (status !== 200) throw new Error(`DeepL failed (${status}): ${data}`);

    const { translations }: DeeplData = JSON.parse(data);
    const src = translations[0].detected_source_language;
    return {
        sourceLanguage: DeeplLanguages[src as keyof typeof DeeplLanguages] ?? src,
        text: translations[0].text,
    };
}

async function runTranslate(text: string, targetLang: string): Promise<TranslationValue> {
    if (IS_WEB || settings.store.service === "google") {
        return googleTranslate(text, "auto", targetLang);
    }
    return deeplTranslate(text, targetLang);
}

export async function translateIncoming(text: string, guildId: string | null | undefined) {
    const target = getTargetLanguageForGuild(guildId);
    try {
        return await runTranslate(text, target);
    } catch (e) {
        showToast(e instanceof Error ? e.message : "Translation failed", Toasts.Type.FAILURE);
        throw e;
    }
}

export async function translateOutgoing(text: string) {
    const target = settings.store.sentTargetLanguage;
    try {
        return await runTranslate(text, target);
    } catch (e) {
        showToast(e instanceof Error ? e.message : "Translation failed", Toasts.Type.FAILURE);
        throw e;
    }
}
