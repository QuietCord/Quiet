/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { isPluginEnabled } from "@api/PluginManager";
import { useSettings } from "@api/Settings";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { FolderIcon, GithubIcon, LogIcon, PaintbrushIcon, RestartIcon } from "@components/Icons";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import { SpecialCard } from "@components/settings/SpecialCard";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { openContributorModal } from "@components/settings/tabs/plugins/ContributorModal";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import SettingsPlugin from "@plugins/_core/settings";
import { settings as quietIdentitySettings } from "@plugins/quietIdentity/settings";
import QuietPerformancePlugin from "@plugins/quietPerformance";
import QuietPresencePlugin from "@plugins/quietPresence";
import { CLIENT_NAME, FORK_REPO, GITHUB_ORG_URL, UPSTREAM_NAME, WEBSITE_URL } from "@shared/brand";
import { IS_WINDOWS } from "@utils/constants";
import { Margins } from "@utils/margins";
import { isPluginDev } from "@utils/misc";
import { relaunch } from "@utils/native";
import { ConfirmModal, Forms, openModal, React, TextInput, useMemo, UserStore } from "@webpack/common";

import { DonateButtonComponent, isQuietDonor } from "./DonateButton";
import { MacOSVibrancySettings } from "./MacVibrancySettings";
import { NotificationSection } from "./NotificationSettings";
import { WindowsMaterialSettings } from "./WindowsMaterialSettings";

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1026533090627174460.png";
const SHIGGY_DONATE_IMAGE = "https://media.discordapp.net/stickers/1039992459209490513.png";
const VENNIE_DONATOR_IMAGE = "https://cdn.discordapp.com/emojis/1238120638020063377.png";
const COZY_CONTRIB_IMAGE = "https://cdn.discordapp.com/emojis/1026533070955872337.png";
const DONOR_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070116305436712.png?size=2048";
const CONTRIB_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070166481895484.png?size=2048";

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function Switches() {
    const settings = useSettings(["useQuickCss", "enableReactDevtools", "frameless", "winNativeTitleBar", "transparent", "winCtrlQ", "disableMinSize"]);

    const Switches = [
        {
            key: "useQuickCss",
            title: "Enable Custom CSS",
            description: "Apply your configured QuickCSS"
        },
        !IS_WEB && (!IS_DISCORD_DESKTOP || !IS_WINDOWS ? {
            key: "frameless",
            title: "Disable the window frame",
            restartRequired: true
        } : {
            key: "winNativeTitleBar",
            title: "Use Windows' native title bar instead of Discord's custom one",
            restartRequired: true
        }),
        !IS_WEB && {
            key: "transparent",
            title: "Enable window transparency",
            description: "A theme that supports transparency is required or this will do nothing. Stops the window from being resizable as a side effect",
            restartRequired: true
        },
        IS_DISCORD_DESKTOP && {
            key: "disableMinSize",
            title: "Disable minimum window size",
            description: "Allows you to resize the window to any size, even smaller than Discord's minimum size",
            restartRequired: true
        },
        !IS_WEB && IS_WINDOWS && {
            key: "winCtrlQ",
            title: "Register Ctrl+Q as shortcut to close Discord (Alternative to Alt+F4)",
            restartRequired: true
        },
        !IS_WEB && {
            key: "enableReactDevtools",
            title: "Enable React Developer Tools",
            description: "Mainly useful for plugin developers. Ignore this if you don't know what it is",
            restartRequired: true
        },
    ] satisfies Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        description?: string;
        restartRequired?: boolean;
    }>;

    return Switches.map(setting => {
        if (!setting) {
            return null;
        }

        const { key, title, description, restartRequired } = setting;

        return (
            <FormSwitch
                key={key}
                title={title}
                description={description}
                value={settings[key]}
                hideBorder
                onChange={v => {
                    settings[key] = v;

                    if (restartRequired) {
                        openModal(props => (
                            <ConfirmModal
                                {...props}
                                title="Restart Required"
                                subtitle="A restart is required to apply this change"
                                confirmText="Restart now"
                                cancelText="Later!"
                                variant="primary"
                                onConfirm={relaunch}
                            />
                        ));
                    }
                }}
            />
        );
    });
}

function QuietIdentitySection() {
    const identity = quietIdentitySettings.use(["showFooter", "showLogo", "footerText"]);

    return (
        <section className={Margins.top16}>
            <Forms.FormTitle tag="h5">Quiet Identity</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom8} style={{ color: "var(--text-muted)" }}>
                Only you see this footer under your messages — it is not sent to Discord.
            </Forms.FormText>
            <FormSwitch
                title="Show identity footer"
                description="Small label with the cat icon under your messages"
                value={identity.showFooter}
                hideBorder
                onChange={v => { quietIdentitySettings.store.showFooter = v; }}
            />
            <FormSwitch
                title="Show cat icon"
                value={identity.showLogo}
                hideBorder
                disabled={!identity.showFooter}
                onChange={v => { quietIdentitySettings.store.showLogo = v; }}
            />
            <Forms.FormTitle tag="h5" className={Margins.top8}>Footer text</Forms.FormTitle>
            <TextInput
                value={identity.footerText}
                placeholder={`via ${CLIENT_NAME}`}
                disabled={!identity.showFooter}
                onChange={v => { quietIdentitySettings.store.footerText = v; }}
            />
        </section>
    );
}

function QuietPerformanceSection() {
    return (
        <section className={Margins.top16}>
            <Forms.FormTitle tag="h5">Quiet Performance</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom8} style={{ color: "var(--text-muted)" }}>
                Profiles: <strong>Balanced</strong> keeps media; <strong>Minimum</strong> is text-first (no embeds, attachments, member list, reactions).
                Toggle blur, GIF autoplay, lazy messages, and Chromium process count individually. The RAM pill matches Task Manager working set for all Discord processes.
            </Forms.FormText>
            <Forms.FormText>
                <a onClick={() => openPluginModal(QuietPerformancePlugin)}>Open Quiet Performance settings</a>
            </Forms.FormText>
        </section>
    );
}

function QuietPresenceSection() {
    const customRpcOn = isPluginEnabled("CustomRPC");

    return (
        <section className={Margins.top16}>
            <Forms.FormTitle tag="h5">Quiet Presence</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom8} style={{ color: "var(--text-muted)" }}>
                Rich Presence visible to everyone (same mechanism as {UPSTREAM_NAME} CustomRPC). Only one custom activity plugin should be active.
            </Forms.FormText>
            {customRpcOn && (
                <Forms.FormText className={Margins.bottom8} style={{ color: "var(--text-warning)" }}>
                    CustomRPC is enabled — disable it in Plugins if Quiet Presence does not update.
                </Forms.FormText>
            )}
            <Forms.FormText>
                <a onClick={() => openPluginModal(QuietPresencePlugin)}>Open Quiet Presence settings</a>
            </Forms.FormText>
        </section>
    );
}

function VencordSettings() {
    const donateImage = useMemo(() =>
        Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE,
        []
    );

    const user = UserStore?.getCurrentUser();

    return (
        <SettingsTab>
            {isQuietDonor(user?.id)
                ? (
                    <SpecialCard
                        title="QuietCord supporters"
                        subtitle="Thank you for supporting Quiet!"
                        description={`Your profile shows the ${CLIENT_NAME} supporter badge. Plugin authors get a separate badge — that is not the same as sponsoring the fork.`}
                        cardImage={VENNIE_DONATOR_IMAGE}
                        backgroundImage={CONTRIB_BACKGROUND_IMAGE}
                        backgroundColor="#EDCC87"
                    >
                        <DonateButtonComponent />
                    </SpecialCard>
                )
                : (
                    <SpecialCard
                        title="Support the Project"
                        description={`Sponsor ${CLIENT_NAME} on GitHub to get the supporter badge on your profile. Upstream ${UPSTREAM_NAME} donations are a different project.`}
                        cardImage={donateImage}
                        backgroundImage={DONOR_BACKGROUND_IMAGE}
                        backgroundColor="#c3a3ce"
                    >
                        <DonateButtonComponent />
                    </SpecialCard>
                )
            }

            {isPluginDev(user?.id) && (
                <SpecialCard
                    title="Plugin author"
                    subtitle="Thanks for shipping code"
                    description={`You appear in the ${CLIENT_NAME} contributor list because you authored plugins — not because of financial support.`}
                    cardImage={COZY_CONTRIB_IMAGE}
                    backgroundImage={DONOR_BACKGROUND_IMAGE}
                    backgroundColor="#87AED9"
                    buttonTitle="See your plugins"
                    buttonOnClick={() => openContributorModal(user)}
                />
            )}

            <section>
                <Forms.FormTitle tag="h5">Quick Actions</Forms.FormTitle>

                <QuickActionCard>
                    <QuickAction
                        Icon={LogIcon}
                        text="Notification Log"
                        action={openNotificationLogModal}
                    />
                    <QuickAction
                        Icon={PaintbrushIcon}
                        text="Edit QuickCSS"
                        action={() => VencordNative.quickCss.openEditor()}
                    />
                    {!IS_WEB && (
                        <>
                            <QuickAction
                                Icon={RestartIcon}
                                text="Relaunch Discord"
                                action={relaunch}
                            />
                            <QuickAction
                                Icon={FolderIcon}
                                text="Open Settings Folder"
                                action={() => VencordNative.settings.openFolder()}
                            />
                        </>
                    )}
                    <QuickAction
                        Icon={GithubIcon}
                        text="View Source Code"
                        action={() => VencordNative.native.openExternal(`https://github.com/${FORK_REPO}`)}
                    />
                    <QuickAction
                        Icon={GithubIcon}
                        text="QuietCord org"
                        action={() => VencordNative.native.openExternal(GITHUB_ORG_URL)}
                    />
                    {WEBSITE_URL && (
                        <QuickAction
                            Icon={GithubIcon}
                            text="About Quiet"
                            action={() => VencordNative.native.openExternal(WEBSITE_URL)}
                        />
                    )}
                </QuickActionCard>
            </section>

            <Divider />

            <QuietIdentitySection />

            <Divider />

            <QuietPerformanceSection />

            <Divider />

            <QuietPresenceSection />

            <Divider />

            <section className={Margins.top16}>
                <Forms.FormTitle tag="h5">Settings</Forms.FormTitle>
                <Forms.FormText className={Margins.bottom20} style={{ color: "var(--text-muted)" }}>
                    Hint: You can change the position of this settings section in the{" "}
                    <a onClick={() => openPluginModal(SettingsPlugin)}>
                        settings of the Settings plugin
                    </a>!
                </Forms.FormText>

                <div className="vc-settings-switches">
                    <Switches />
                </div>
            </section>


            <MacOSVibrancySettings />
            <WindowsMaterialSettings />

            <NotificationSection />
        </SettingsTab>
    );
}

export default wrapTab(VencordSettings, `${CLIENT_NAME} Settings`);
