/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./HubTab.css";

import { isPluginEnabled } from "@api/PluginManager";
import { useSettings } from "@api/Settings";
import { mergeCloudSettings } from "@api/SettingsSync/cloudMerge";
import { areLocalSettingsDirty, getCloudSyncDirection } from "@api/SettingsSync/cloudSync";
import { QuietHubHomeIcon } from "@components/QuietHubHomeIcon";
import { BrandLogoIcon } from "@components/BrandLogoIcon";
import { CloudIcon, MainSettingsIcon, RestartIcon, SafetyIcon } from "@components/Icons";
import { Divider } from "@components/Divider";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { openPluginModal } from "@components/settings/tabs/plugins/PluginModal";
import { getFocusSession, remainingMs, subscribeFocusSession, toggleFocus } from "@plugins/quietFocus/focusState";
import QuietFocusPlugin from "@plugins/quietFocus";
import {
    formatHomeBrandHubDetail,
    getHomeBrandHealth,
    subscribeHomeBrandHealth,
} from "@plugins/quietHomeBrand/homeBrandHealth";
import QuietHomeBrandPlugin from "@plugins/quietHomeBrand";
import { getPerformanceControllerState } from "@plugins/quietPerformance/engine/stage4/performanceController";
import { formatPatchHealthToast } from "@plugins/quietPerformance/patchHealthReport";
import { settings as perfSettings } from "@plugins/quietPerformance/settings";
import QuietPerformancePlugin from "@plugins/quietPerformance";
import { getSplitChannelTitle } from "@plugins/quietSplitView/channelTitle";
import { closeSplitView, SplitStore } from "@plugins/quietSplitView/splitStore";
import QuietSplitViewPlugin from "@plugins/quietSplitView";
import QuietTranslatorPlugin from "@plugins/quietTranslator";
import { CLIENT_NAME } from "@shared/brand";
import {
    formatQuietHubPatchLine,
    getQuietHubBrokenPatches,
} from "@shared/quietHubHealth";
import { getBuildNumber } from "@webpack/patcher";
import { ChannelStore, Forms, SettingsRouter, useEffect, useState, useStateFromStores } from "@webpack/common";

import type { IconProps } from "@utils/types";

function MoonQuickIcon({ className, width = 24, height = 24 }: IconProps) {
    return (
        <svg className={className} width={width} height={height} viewBox="0 0 24 24" aria-hidden>
            <path
                fill="currentColor"
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            />
        </svg>
    );
}

function formatFocusRemaining() {
    const ms = remainingMs();
    if (ms == null) return "Until you turn it off";
    const min = Math.ceil(ms / 60_000);
    if (min < 60) return `${min} min left`;
    return `${Math.floor(min / 60)}h ${min % 60}m left`;
}

function formatCloudStatus(authenticated: boolean, settingsSync: boolean) {
    if (!authenticated) return "Connect Cloud in the Cloud tab to sync across devices.";
    const parts: string[] = [];
    parts.push(settingsSync ? "Sync enabled" : "Sync disabled");
    if (settingsSync) parts.push(`Rule: ${getCloudSyncDirection()}`);
    parts.push(areLocalSettingsDirty() ? "Unsaved local changes" : "No pending local changes");
    return parts.join(" · ");
}

function HubStatusTile(props: {
    label: string;
    headline: string;
    detail: string;
    dotState?: "on" | "warn" | "info" | "off";
    active?: boolean;
    warn?: boolean;
    muted?: boolean;
    onClick?: () => void;
}) {
    const { label, headline, detail, dotState = "off", active, warn, muted, onClick } = props;
    return (
        <div
            className="vc-quiet-hub-status-card"
            data-active={active ? "true" : undefined}
            data-warn={warn ? "true" : undefined}
            data-muted={muted ? "true" : undefined}
            data-clickable={onClick ? "true" : undefined}
            onClick={onClick}
            onKeyDown={onClick ? e => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            <div className="vc-quiet-hub-status-label">
                <span className="vc-quiet-hub-status-dot" data-state={dotState} />
                <Forms.FormText tag="span" style={{ fontWeight: 600, color: "var(--header-secondary)" }}>
                    {label}
                </Forms.FormText>
            </div>
            <p className="vc-quiet-hub-status-headline">{headline}</p>
            <p className="vc-quiet-hub-status-detail">{detail}</p>
        </div>
    );
}

function QuietHubContent() {
    const { cloud } = useSettings(["cloud.authenticated", "cloud.settingsSync"]);
    const [focusSession, setFocusSession] = useState(getFocusSession);
    const [, setClock] = useState(0);
    const [homeBrandHealth, setHomeBrandHealth] = useState(getHomeBrandHealth);
    const [, setPatchTick] = useState(0);

    const splitState = useStateFromStores([SplitStore], () => SplitStore.getState(), []);
    const splitOpen = !!splitState.channelId;

    useEffect(() => subscribeFocusSession(() => setFocusSession(getFocusSession())), []);
    useEffect(() => subscribeHomeBrandHealth(() => setHomeBrandHealth(getHomeBrandHealth())), []);
    useEffect(() => {
        const id = setInterval(() => {
            setClock(c => c + 1);
            setPatchTick(t => t + 1);
            setHomeBrandHealth(getHomeBrandHealth());
        }, 5000);
        return () => clearInterval(id);
    }, []);

    const perfOn = isPluginEnabled("QuietPerformance");
    const focusOn = isPluginEnabled("QuietFocus");
    const splitPluginOn = isPluginEnabled("QuietSplitView");
    const homeBrandOn = isPluginEnabled("QuietHomeBrand");

    const controller = perfOn ? getPerformanceControllerState() : null;
    const hubBroken = getQuietHubBrokenPatches();
    const patchBroken = hubBroken.length > 0;
    const patchLine = formatQuietHubPatchLine();
    const brandingDetail = formatHomeBrandHubDetail(homeBrandHealth);

    const splitChannel = splitOpen ? ChannelStore.getChannel(splitState.channelId) : null;
    const splitTitle = splitOpen ? getSplitChannelTitle(splitChannel) : null;

    const systemWarn = patchBroken || (homeBrandOn && !homeBrandHealth.brandingOk);

    return (
        <>
            <header className="vc-quiet-hub-hero">
                <div className="vc-quiet-hub-hero-logo">
                    <QuietHubHomeIcon width={72} height={72} />
                </div>
                <div className="vc-quiet-hub-hero-text">
                    <Forms.FormTitle tag="h3" style={{ marginBottom: "0.35em" }}>Quiet Hub</Forms.FormTitle>
                    <Forms.FormText>
                        Your {CLIENT_NAME} home — Focus, performance, split chat, cloud, and branding in one place.
                    </Forms.FormText>
                </div>
            </header>

            <div
                className="vc-quiet-hub-health-banner"
                data-warn={systemWarn ? "true" : undefined}
            >
                <p className="vc-quiet-hub-health-banner-title">
                    {patchBroken ? "Some patches need attention" : "Patches OK"}
                    {" · "}
                    {homeBrandOn
                        ? (homeBrandHealth.brandingOk ? "Branding OK" : "Branding not ready")
                        : "Home brand off"}
                </p>
                <p className="vc-quiet-hub-health-banner-detail">
                    {patchLine}
                    {homeBrandOn ? ` · ${brandingDetail}` : ""}
                    {` · Build ${getBuildNumber()}`}
                </p>
            </div>

            <Forms.FormTitle tag="h5">Status</Forms.FormTitle>
            <Forms.FormText style={{ marginTop: "0.35rem", marginBottom: "1rem" }}>
                Live overview — click a tile to open that module&apos;s settings.
            </Forms.FormText>

            <div className="vc-quiet-hub-status-grid">
                <HubStatusTile
                    label="Focus"
                    headline={!focusOn ? "Plugin off" : focusSession.active ? "Active" : "Inactive"}
                    detail={
                        !focusOn
                            ? "Turn on QuietFocus in Plugins."
                            : focusSession.active
                                ? `${focusSession.dmsAndMentions ? "DMs and @mentions only" : "Minimal UI"} · ${formatFocusRemaining()}`
                                : "Use the moon in the server list or Quick actions."
                    }
                    dotState={focusSession.active ? "on" : "off"}
                    active={focusSession.active}
                    muted={!focusOn}
                    onClick={focusOn ? () => openPluginModal(QuietFocusPlugin) : undefined}
                />
                <HubStatusTile
                    label="Performance"
                    headline={
                        !perfOn
                            ? "Plugin off"
                            : perfSettings.store.performanceSafeMode
                                ? "Safe Mode"
                                : perfSettings.store.profile
                    }
                    detail={
                        !perfOn
                            ? "Turn on QuietPerformance in Plugins."
                            : [
                                perfSettings.store.autoPerformanceController && controller
                                    ? `Adaptive controller · ${controller.mode}`
                                    : "Manual profile",
                                patchBroken ? formatPatchHealthToast() : "Patches OK",
                            ].join(" · ")
                    }
                    dotState={patchBroken ? "warn" : perfOn ? "info" : "off"}
                    warn={patchBroken}
                    muted={!perfOn}
                    onClick={perfOn ? () => openPluginModal(QuietPerformancePlugin) : undefined}
                />
                <HubStatusTile
                    label="Split view"
                    headline={!splitPluginOn ? "Plugin off" : splitOpen ? "Panel open" : "Closed"}
                    detail={
                        !splitPluginOn
                            ? "Turn on QuietSplitView in Plugins."
                            : splitOpen
                                ? `${splitTitle ?? "Side channel"}${splitState.pinned ? " · pinned" : ""}`
                                : "Right-click a channel or use /split."
                    }
                    dotState={splitOpen ? "info" : "off"}
                    active={splitOpen}
                    muted={!splitPluginOn}
                    onClick={splitPluginOn ? () => openPluginModal(QuietSplitViewPlugin) : undefined}
                />
                <HubStatusTile
                    label="Cloud"
                    headline={cloud.authenticated ? "Signed in" : "Not connected"}
                    detail={formatCloudStatus(cloud.authenticated, cloud.settingsSync)}
                    dotState={cloud.authenticated ? "on" : "off"}
                    active={cloud.authenticated && cloud.settingsSync}
                    onClick={() => SettingsRouter.openUserSettings("vencord_cloud_panel")}
                />
                <HubStatusTile
                    label="Home brand"
                    headline={
                        !homeBrandOn
                            ? "Plugin off"
                            : homeBrandHealth.brandingOk
                                ? "Showing Quiet logo"
                                : homeBrandHealth.waitingForNav
                                    ? "Waiting for nav"
                                    : "Not mounted"
                    }
                    detail={brandingDetail}
                    dotState={homeBrandHealth.brandingOk ? "on" : homeBrandHealth.waitingForNav ? "info" : "warn"}
                    warn={homeBrandOn && !homeBrandHealth.brandingOk && !homeBrandHealth.waitingForNav}
                    muted={!homeBrandOn}
                    onClick={homeBrandOn ? () => openPluginModal(QuietHomeBrandPlugin) : undefined}
                />
            </div>

            <section className="vc-quiet-hub-section">
                <Forms.FormTitle tag="h5">Open settings</Forms.FormTitle>
                <Forms.FormText style={{ marginTop: "0.35rem", marginBottom: "0.75rem" }}>
                    Jump straight to each Quiet module or Cloud.
                </Forms.FormText>
                <QuickActionCard>
                    <QuickAction
                        Icon={MoonQuickIcon}
                        text="QuietFocus"
                        disabled={!focusOn}
                        action={() => openPluginModal(QuietFocusPlugin)}
                    />
                    <QuickAction
                        Icon={SafetyIcon}
                        text="QuietPerformance"
                        disabled={!perfOn}
                        action={() => openPluginModal(QuietPerformancePlugin)}
                    />
                    <QuickAction
                        Icon={MainSettingsIcon}
                        text="QuietSplitView"
                        disabled={!splitPluginOn}
                        action={() => openPluginModal(QuietSplitViewPlugin)}
                    />
                    <QuickAction
                        Icon={CloudIcon}
                        text="Cloud tab"
                        action={() => SettingsRouter.openUserSettings("vencord_cloud_panel")}
                    />
                    <QuickAction
                        Icon={BrandLogoIcon}
                        text="QuietHomeBrand"
                        disabled={!homeBrandOn}
                        action={() => openPluginModal(QuietHomeBrandPlugin)}
                    />
                </QuickActionCard>
            </section>

            <section className="vc-quiet-hub-section">
                <Forms.FormTitle tag="h5">Quick actions</Forms.FormTitle>
                <Forms.FormText style={{ marginTop: "0.35rem", marginBottom: "0.75rem" }}>
                    Everyday controls without opening each plugin.
                </Forms.FormText>
                <QuickActionCard>
                    <QuickAction
                        Icon={MoonQuickIcon}
                        text={focusSession.active ? "End Focus" : "Focus on"}
                        disabled={!focusOn}
                        action={() => toggleFocus()}
                    />
                    <QuickAction
                        Icon={SafetyIcon}
                        text={perfSettings.store.performanceSafeMode ? "Leave Safe Mode" : "Safe Mode"}
                        disabled={!perfOn}
                        action={() => {
                            perfSettings.store.performanceSafeMode = !perfSettings.store.performanceSafeMode;
                        }}
                    />
                    <QuickAction
                        Icon={RestartIcon}
                        text="Close split"
                        disabled={!splitPluginOn || !splitOpen}
                        action={() => closeSplitView()}
                    />
                    <QuickAction
                        Icon={CloudIcon}
                        text="Merge cloud"
                        disabled={!cloud.authenticated || !cloud.settingsSync}
                        action={() => void mergeCloudSettings(true)}
                    />
                    <QuickAction
                        Icon={MainSettingsIcon}
                        text="All plugins"
                        action={() => SettingsRouter.openUserSettings("vencord_plugins_panel")}
                    />
                </QuickActionCard>
            </section>

            <Divider style={{ marginTop: "1.75rem", marginBottom: "1.25rem" }} />

            <section>
                <Forms.FormTitle tag="h5">More modules</Forms.FormTitle>
                <Forms.FormText style={{ marginTop: "0.35rem", marginBottom: "0.75rem" }}>
                    Additional Quiet plugins.
                </Forms.FormText>
                <div className="vc-quiet-hub-plugin-grid">
                    <QuickActionCard>
                        <QuickAction
                            Icon={MainSettingsIcon}
                            text="QuietTranslator"
                            action={() => openPluginModal(QuietTranslatorPlugin)}
                        />
                    </QuickActionCard>
                </div>
            </section>
        </>
    );
}

function QuietHubTab() {
    return (
        <SettingsTab>
            <QuietHubContent />
        </SettingsTab>
    );
}

export default wrapTab(QuietHubTab, "Quiet Hub");

export function openQuietHubSettings() {
    SettingsRouter.openUserSettings("vencord_quiet_hub_panel");
}
