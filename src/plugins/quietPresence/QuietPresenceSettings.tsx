/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./settings.css";

import { FormSwitch } from "@components/FormSwitch";
import { isPluginEnabled } from "@api/PluginManager";
import { Divider } from "@components/Divider";
import { Heading } from "@components/Heading";
import { resolveError } from "@components/settings/tabs/plugins/components/Common";
import { debounce } from "@shared/debounce";
import { classNameFactory } from "@utils/css";
import { ActivityType } from "@vencord/discord-types/enums";
import { Select, Text, TextInput, useState } from "@webpack/common";

import { QUIET_RPC_APP_ID } from "@shared/brand";

import { SETUP_STEPS } from "./defaults";
import { DEV_OVERLAY_LINES } from "./devOverlay";
import { getCachedDevGitContext } from "./smartDev";
import { restartPresenceRotation } from "./rotationTimer";
import { ROTATION_LINES } from "./rotation";
import { setQuietPresence } from "./rpc";
import { settings, TimestampMode } from "./settings";

const cl = classNameFactory("vc-quietPresence-settings-");

const PLUGIN_NAME = "QuietPresence";

type SettingsKey = keyof typeof settings.store;

interface TextOption {
    settingsKey: SettingsKey;
    label: string;
    isValid?: (value: string) => true | string;
    disabled?: boolean;
}

const updatePresence = debounce(() => {
    setQuietPresence(true);
    if (isPluginEnabled(PLUGIN_NAME)) {
        restartPresenceRotation();
        void setQuietPresence();
    }
});

function isAppIdValid(value: string) {
    if (!value.trim()) return true;
    if (!/^\d{16,21}$/.test(value)) return "Application ID must be 16–21 digits.";
    return true;
}

function max128(value: string) {
    if (value.length > 128) return "Max 128 characters.";
    return true;
}

function SingleSetting({ settingsKey, label, isValid, disabled }: TextOption) {
    const [state, setState] = useState(String(settings.store[settingsKey] ?? ""));
    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue: string) {
        const valid = isValid?.(newValue) ?? true;
        setState(newValue);
        setError(resolveError(valid));
        if (valid === true) {
            (settings.store as Record<string, unknown>)[settingsKey] = newValue;
            updatePresence();
        }
    }

    return (
        <div className={cl("single")}>
            <Heading tag="h5">{label}</Heading>
            <TextInput value={state} onChange={handleChange} placeholder="…" disabled={disabled} />
            {error && <Text className={cl("error")} variant="text-sm/normal">{error}</Text>}
        </div>
    );
}

export function QuietPresenceSettings() {
    const s = settings.use(["type", "timestampMode", "rotateEnabled", "rotateIntervalSec", "devOverlayEnabled", "devOverlayAuto"]);
    const gitCtx = getCachedDevGitContext();

    return (
        <div className={cl("root")}>
            <Text variant="text-sm/normal">
                Sets activity via Discord&apos;s internal <code>LOCAL_ACTIVITY_UPDATE</code> (same as CustomRPC / desktop RPC on port 6463).
                Discord&apos;s servers still validate app IDs and artwork — injection does not skip that.
            </Text>
            {QUIET_RPC_APP_ID.trim() ? (
                <Text variant="text-sm/normal">Using bundled Application ID from Quiet (no portal setup needed).</Text>
            ) : (
                <>
                    <Text variant="text-sm/normal">
                        Leave Application ID empty for automatic text-only presence (Playing Quiet + details). Add an App ID only for the cat artwork on the card.
                    </Text>
                    <ol className={cl("steps")}>
                        {SETUP_STEPS.map(step => <li key={step}>{step}</li>)}
                    </ol>
                </>
            )}

            {!QUIET_RPC_APP_ID.trim() && (
                <SingleSetting settingsKey="appID" label="Application ID (optional)" isValid={isAppIdValid} />
            )}

            <Divider />

            <FormSwitch
                title="Auto dev overlay"
                description="Enable dev card when QUIET_DEV=1 or git repo exists at QUIET_DEV_REPO_PATH / QUIET_REPO_PATH"
                value={s.devOverlayAuto !== false}
                onChange={v => {
                    settings.store.devOverlayAuto = v;
                    updatePresence();
                }}
            />
            {gitCtx && (
                <Text variant="text-sm/normal" className={cl("error")} style={{ color: "var(--text-muted)" }}>
                    Detected: {gitCtx.active ? "dev mode" : "off"}
                    {gitCtx.branch ? ` · branch ${gitCtx.branch}` : ""}
                    {gitCtx.repoPath ? ` · ${gitCtx.repoPath}` : ""}
                </Text>
            )}
            <FormSwitch
                title="Dev overlay (only you)"
                description="Extra rotating card on your profile — not sent to Discord; friends never see it"
                value={s.devOverlayEnabled === true}
                onChange={v => {
                    settings.store.devOverlayEnabled = v;
                    updatePresence();
                }}
            />
            {s.devOverlayEnabled === true && (
                <>
                    <Heading tag="h5">Dev lines (edit in devOverlay.ts)</Heading>
                    <ul className={cl("steps")}>
                        {DEV_OVERLAY_LINES.map((line, i) => (
                            <li key={i}>
                                <strong>{line.details}</strong>
                                {" · "}
                                {line.state}
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <FormSwitch
                title="Rotate messages"
                description="Cycle lines below every few seconds (overrides Details / State fields)"
                value={s.rotateEnabled !== false}
                onChange={v => {
                    settings.store.rotateEnabled = v;
                    updatePresence();
                }}
            />
            {s.rotateEnabled !== false && (
                <>
                    <Heading tag="h5">Rotation interval (seconds)</Heading>
                    <TextInput
                        type="number"
                        value={String(s.rotateIntervalSec ?? 15)}
                        onChange={v => {
                            const n = parseInt(v, 10);
                            if (!Number.isFinite(n)) return;
                            settings.store.rotateIntervalSec = n;
                            updatePresence();
                        }}
                    />
                    <Heading tag="h5">Rotating lines (edit in rotation.ts)</Heading>
                    <ul className={cl("steps")}>
                        {ROTATION_LINES.map((line, i) => (
                            <li key={i}>
                                <strong>{line.details}</strong>
                                {" · "}
                                {line.state}
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <div className={cl("pair")}>
                <SingleSetting settingsKey="appName" label="Application name" isValid={max128} />
                <SingleSetting settingsKey="imageBig" label='Large image key (e.g. "quiet")' isValid={max128} />
            </div>

            <div className={cl("pair")}>
                <SingleSetting settingsKey="details" label="Details (line 1)" isValid={max128} disabled={s.rotateEnabled !== false} />
                <SingleSetting settingsKey="state" label="State (line 2)" isValid={max128} disabled={s.rotateEnabled !== false} />
            </div>

            <SingleSetting settingsKey="imageBigTooltip" label="Large image hover text" isValid={max128} />

            <Divider />

            <div className={cl("pair")}>
                <SingleSetting settingsKey="buttonOneText" label="Button label" isValid={max128} />
                <SingleSetting settingsKey="buttonOneURL" label="Button URL" />
            </div>

            <Heading tag="h5">Activity type</Heading>
            <Select
                options={[
                    { label: "Playing", value: ActivityType.PLAYING, default: true },
                    { label: "Listening", value: ActivityType.LISTENING },
                    { label: "Watching", value: ActivityType.WATCHING },
                ]}
                select={v => {
                    settings.store.type = v;
                    updatePresence();
                }}
                isSelected={v => v === s.type}
                serialize={String}
            />

            <Heading tag="h5">Timestamp</Heading>
            <Select
                options={[
                    { label: "Since enabled", value: TimestampMode.NOW, default: true },
                    { label: "None", value: TimestampMode.NONE },
                ]}
                select={v => {
                    settings.store.timestampMode = v;
                    updatePresence();
                }}
                isSelected={v => v === s.timestampMode}
                serialize={String}
            />
        </div>
    );
}
