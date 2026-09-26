/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Settings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { relaunch } from "@utils/native";
import { deflateSync, inflateSync } from "fflate";

import { openCloudMergeConflictModal } from "./CloudMergeConflictModal";
import { checkCloudUrlCsp, getCloudAuth, getCloudUrl } from "./cloudSetup";
import { exportSettings, importSettings } from "./offline";
import { markLocalSettingsClean, putCloudSettings } from "./cloudSync";

const logger = new Logger("SettingsSync:Merge", "#39b7e0");

export interface SettingsMergeConflict {
    namespace: string;
    yours: unknown;
    theirs: unknown;
}

interface SettingsBackup {
    settings: Record<string, unknown>;
    quickCss: string;
}

interface MergeResponse {
    complete?: boolean;
    unchanged?: boolean;
    conflicts?: SettingsMergeConflict[];
    merged?: string;
    error?: string;
    currentRemote?: string;
}

type ConflictSide = "yours" | "theirs";

function bytesToBase64(bytes: Uint8Array) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i]!);
    return btoa(binary);
}

function base64ToBytes(b64: string) {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++)
        out[i] = binary.charCodeAt(i);
    return out;
}

function decodeMergedPayload(b64: string) {
    return new TextDecoder().decode(inflateSync(base64ToBytes(b64)));
}

export function formatMergeNamespace(namespace: string) {
    if (namespace === "quickCss") return "Quick CSS";
    if (namespace.startsWith("plugins.")) return `Plugin: ${namespace.slice(8)}`;
    if (namespace.startsWith("settings.")) return `Core setting: ${namespace.slice(9)}`;
    return namespace;
}

function parseBackup(json: string): SettingsBackup {
    const parsed = JSON.parse(json) as SettingsBackup;
    if (!parsed.settings || typeof parsed.quickCss !== "string")
        throw new Error("Invalid settings backup");
    return parsed;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return v != null && typeof v === "object" && !Array.isArray(v);
}

function deepMergeRecord(target: Record<string, unknown>, overlay: Record<string, unknown>) {
    for (const key of Object.keys(overlay)) {
        const o = overlay[key];
        const t = target[key];
        if (isPlainObject(t) && isPlainObject(o))
            deepMergeRecord(t, o);
        else
            target[key] = o;
    }
}

function setNamespaceValue(bundle: SettingsBackup, namespace: string, value: unknown) {
    if (namespace === "quickCss") {
        bundle.quickCss = typeof value === "string" ? value : String(value ?? "");
        return;
    }
    if (namespace.startsWith("plugins.")) {
        const name = namespace.slice(8);
        if (!bundle.settings.plugins || typeof bundle.settings.plugins !== "object")
            bundle.settings.plugins = {};
        (bundle.settings.plugins as Record<string, unknown>)[name] = value;
        return;
    }
    if (namespace.startsWith("settings.")) {
        bundle.settings[namespace.slice(9)] = value;
    }
}

export async function composeMergedBackup(
    partialJson: string,
    conflicts: SettingsMergeConflict[],
    picks: Record<string, ConflictSide> = {},
) {
    const bundle = parseBackup(await exportSettings({ minify: true }));
    const partial = parseBackup(partialJson);
    deepMergeRecord(bundle.settings, partial.settings);

    const conflictNs = new Set(conflicts.map(c => c.namespace));
    if (!conflictNs.has("quickCss"))
        bundle.quickCss = partial.quickCss;

    for (const c of conflicts) {
        const side = picks[c.namespace] ?? "yours";
        setNamespaceValue(bundle, c.namespace, side === "theirs" ? c.theirs : c.yours);
    }

    return JSON.stringify(bundle);
}

export async function finishCloudMergeImport(serverPartialJson: string, shouldNotify: boolean, conflicts: SettingsMergeConflict[] = [], picks: Record<string, ConflictSide> = {}) {
    const mergedJson = await composeMergedBackup(serverPartialJson, conflicts, picks);
    await importSettings(mergedJson);
    markLocalSettingsClean();
    await putCloudSettings(false);

    logger.info("Settings merged with cloud (conflicts resolved)");
    if (shouldNotify)
        showNotification({
            title: "Cloud Settings",
            body: "Merged local and cloud settings. Restart to apply everything.",
            color: "var(--green-360)",
            onClick: IS_WEB ? () => location.reload() : relaunch,
            noPersist: true,
        });
}

async function requestCloudMergePayload() {
    const localEtag = Settings.cloud.settingsSyncVersion.toString();

    const remoteRes = await fetch(new URL("/v1/settings", getCloudUrl()), {
        method: "GET",
        headers: {
            Authorization: await getCloudAuth(),
            Accept: "application/octet-stream",
        },
    });

    if (remoteRes.status === 404)
        return { kind: "noop" as const, reason: "empty" as const };

    if (!remoteRes.ok)
        return { kind: "error" as const, message: `Prefetch failed (${remoteRes.status})` };

    const remoteEtag = remoteRes.headers.get("etag") ?? "";
    if (!remoteEtag || remoteEtag === localEtag)
        return { kind: "noop" as const, reason: "synced" as const };

    const localJson = await exportSettings({ minify: true });
    const localDeflated = deflateSync(new TextEncoder().encode(localJson));

    const mergeRes = await fetch(new URL("/v1/settings/merge", getCloudUrl()), {
        method: "POST",
        headers: {
            Authorization: await getCloudAuth(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            localEtag,
            remoteEtag,
            local: bytesToBase64(localDeflated),
        }),
    });

    const payload = await mergeRes.json() as MergeResponse;

    if (!mergeRes.ok)
        return { kind: "error" as const, message: payload.error ?? `Merge failed (${mergeRes.status})` };

    if (payload.unchanged)
        return { kind: "noop" as const, reason: "synced" as const };

    if (payload.complete && payload.merged)
        return { kind: "complete" as const, mergedJson: decodeMergedPayload(payload.merged) };

    if (payload.conflicts?.length && payload.merged)
        return {
            kind: "conflicts" as const,
            conflicts: payload.conflicts,
            partialJson: decodeMergedPayload(payload.merged),
        };

    if (payload.conflicts?.length)
        return { kind: "error" as const, message: "Merge blocked but server sent no partial merge." };

    return { kind: "error" as const, message: "Unexpected merge response." };
}

export async function mergeCloudSettings(shouldNotify = true) {
    if (!await checkCloudUrlCsp()) return false;

    try {
        const result = await requestCloudMergePayload();

        if (result.kind === "noop") {
            if (shouldNotify)
                showNotification({
                    title: "Cloud Settings",
                    body: result.reason === "empty"
                        ? "Nothing in the cloud to merge with."
                        : "Already in sync — no merge needed.",
                    noPersist: true,
                });
            return false;
        }

        if (result.kind === "error") {
            logger.error("Merge API error", result.message);
            if (shouldNotify)
                showNotification({
                    title: "Cloud Settings",
                    body: result.message,
                    color: "var(--red-360)",
                });
            return false;
        }

        if (result.kind === "complete") {
            await finishCloudMergeImport(result.mergedJson, shouldNotify);
            return true;
        }

        return openCloudMergeConflictModal({
            conflicts: result.conflicts,
            partialJson: result.partialJson,
            shouldNotify,
        });
    } catch (e: any) {
        logger.error("Merge failed", e);
        if (shouldNotify)
            showNotification({
                title: "Cloud Settings",
                body: `Merge failed (${String(e)}).`,
                color: "var(--red-360)",
            });
        return false;
    }
}
