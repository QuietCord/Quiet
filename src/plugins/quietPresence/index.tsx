/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { getUserSettingLazy } from "@api/UserSettings";
import { Divider } from "@components/Divider";
import { ErrorCard } from "@components/ErrorCard";
import { Link } from "@components/Link";
import { CLIENT_NAME } from "@shared/brand";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { useAwaiter } from "@utils/react";
import definePlugin from "@utils/types";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { Button, Forms, showToast, Toasts, UserStore } from "@webpack/common";

import { createQuietActivity, setQuietPresence } from "./rpc";
import { getCurrentRotationLine } from "./rotation";
import { initSmartDevOverlay } from "./smartDev";
import { startPresenceRotation, stopPresenceRotation } from "./rotationTimer";
import { settings } from "./settings";
import { useEffect, useState } from "@webpack/common";

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;

const useProfileThemeStyle = findByCodeLazy("profileThemeStyle:", "--profile-gradient-primary-color");
const ActivityView = findComponentByCodeLazy(".party?(0", "USER_PROFILE_ACTIVITY");

export default definePlugin({
    name: "QuietPresence",
    description: `Rich Presence for ${CLIENT_NAME} — visible to everyone (CustomRPC-style)`,
    tags: ["Quiet", "Activity"],
    authors: [{ name: "hyusband", id: 0n }],
    dependencies: ["UserSettingsAPI"],
    enabledByDefault: true,
    requiresRestart: false,
    settings,

    patches: [
        {
            find: ".USER_PROFILE_ACTIVITY_BUTTONS),",
            replacement: {
                match: /.getId\(\)===\i.id/,
                replace: "$& && false",
            },
        },
    ],

    start() {
        if (isPluginEnabled("CustomRPC")) {
            showToast("Disable CustomRPC if Quiet Presence does not show correctly.", Toasts.Type.MESSAGE);
        }
        void initSmartDevOverlay().then(() => {
            void setQuietPresence();
            startPresenceRotation();
        });
    },

    stop: () => {
        stopPresenceRotation();
        void setQuietPresence(true);
    },

    settingsAboutComponent: () => {
        const [tick, setTick] = useState(0);
        useEffect(() => {
            if (settings.store.rotateEnabled === false) return;
            const id = setInterval(() => setTick(t => t + 1), 1000);
            return () => clearInterval(id);
        }, [settings.store.rotateEnabled]);

        const [activity] = useAwaiter(createQuietActivity, {
            fallbackValue: undefined,
            deps: [...Object.values(settings.store), tick, getCurrentRotationLine().details],
        });
        const gameActivityEnabled = ShowCurrentGame.useSetting();
        const { profileThemeStyle } = useProfileThemeStyle({});

        return (
            <>
                {!gameActivityEnabled && (
                    <ErrorCard className={classes(Margins.top16, Margins.bottom16)} style={{ padding: "1em" }}>
                        <Forms.FormTitle>Activity sharing off</Forms.FormTitle>
                        <Forms.FormText>Others will not see your Rich Presence until this is enabled.</Forms.FormText>
                        <Button
                            color={Button.Colors.TRANSPARENT}
                            className={Margins.top8}
                            onClick={() => ShowCurrentGame.updateSetting(true)}
                        >
                            Enable activity sharing
                        </Button>
                    </ErrorCard>
                )}

                <Forms.FormText className={Margins.top8}>
                    Based on Vencord <Link href="https://github.com/Vendicated/Vencord/tree/main/src/plugins/customRPC">CustomRPC</Link>.
                    Upload <code>assets/brand/logo.png</code> to your Discord app as asset key <code>quiet</code>.
                </Forms.FormText>

                <Divider className={Margins.top8} />

                <div style={{ width: "284px", ...profileThemeStyle, marginTop: 8, borderRadius: 8, background: "var(--background-mod-muted)" }}>
                    {activity
                        ? (
                            <ActivityView
                                activity={activity}
                                user={UserStore.getCurrentUser()}
                                currentUser={UserStore.getCurrentUser()}
                            />
                        )
                        : (
                            <Forms.FormText style={{ padding: 16 }}>Enable the plugin to preview (App ID optional for text-only).</Forms.FormText>
                        )}
                </div>
            </>
        );
    },
});
