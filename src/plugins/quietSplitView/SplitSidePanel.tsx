/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { classNameFactory } from "@utils/css";
import type { Channel, Guild } from "@vencord/discord-types";
import {
    extractAndLoadChunksLazy,
    findByPropsLazy,
    findComponentByCodeLazy,
    findCssClassesLazy,
    mapMangledModuleLazy,
} from "@webpack";
import {
    ChannelRouter,
    ChannelStore,
    Clickable,
    GuildStore,
    MessageActions,
    MessageStore,
    RelationshipStore,
    SelectedChannelStore,
    SelectedGuildStore,
    Tooltip,
    useCallback,
    useEffect,
    useLayoutEffect,
    UserStore,
    useState,
    useStateFromStores,
} from "@webpack/common";

import { swapSplitWithMain } from "./actions";
import { getSplitChannelTitle } from "./channelTitle";
import { closeSplitView, settings, SplitStore, toggleSplitPin } from "./splitStore";
import { CloseIcon, PinIcon, SwapChannelsIcon } from "./splitIcons";
import { ChannelSectionStore } from "./webpackStores";

const cl = classNameFactory("vc-quiet-split-");

const HeaderBar = findComponentByCodeLazy("toolbarClassName:", "}),onDoubleClick:");
const ForumView = findComponentByCodeLazy("sidebarState");
const Chat = findComponentByCodeLazy("filterAfterTimestamp:", "chatInputType");
const SidebarComponents = mapMangledModuleLazy("ChannelChatResizableSidebar", {
    Resize: (value: unknown) => typeof value === "function",
});
const ChannelHeader = findComponentByCodeLazy("`channel-${");
const WanderingCubesLoading = findComponentByCodeLazy('="wanderingCubes"');

const ChatInputTypes = findByPropsLazy("FORM", "NORMAL");
const Sidebars = findByPropsLazy("ThreadSidebar", "MessageRequestSidebar");
const ChatClasses = findCssClassesLazy("threadSidebarOpen", "loader");

const requireForumView = extractAndLoadChunksLazy(
    ["Missing channel in Channel.renderHeaderToolbar"],
    /Promise\.all\(\[((?:\i\.e\("\d+"\),?)+)\]\)\.then\(\i\.bind\(\i,(\d+)\)\)[^}]{0,100}?name:"ForumChannel"/,
);

function ToolbarIcon({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode; }) {
    return (
        <Tooltip text={label}>
            {({ onMouseEnter, onMouseLeave }) => (
                <Clickable
                    className={cl("toolbar-btn")}
                    onClick={onClick}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    aria-label={label}
                >
                    {children}
                </Clickable>
            )}
        </Tooltip>
    );
}

function SplitHeader({ guild, channel }: { guild: Guild | null; channel: Channel; }) {
    const name = useStateFromStores(
        [UserStore, RelationshipStore],
        () => getSplitChannelTitle(channel),
        [channel.id, channel.name],
    );

    const parentChannel = useStateFromStores(
        [ChannelStore],
        () => ChannelStore.getChannel(channel?.parent_id),
        [channel?.parent_id],
    );

    const pinned = useStateFromStores([SplitStore], () => SplitStore.getState().pinned, []);

    const onSwap = useCallback(() => swapSplitWithMain(), []);
    const onPin = useCallback(() => toggleSplitPin(), []);
    const onClose = useCallback(() => closeSplitView(), []);

    return (
        <HeaderBar
            toolbar={(
                <>
                    <ToolbarIcon label="Swap main and side" onClick={onSwap}>
                        <SwapChannelsIcon />
                    </ToolbarIcon>
                    <ToolbarIcon label={pinned ? "Unpin side panel" : "Pin side panel"} onClick={onPin}>
                        <PinIcon active={pinned} />
                    </ToolbarIcon>
                    <ToolbarIcon label="Close side panel" onClick={onClose}>
                        <CloseIcon />
                    </ToolbarIcon>
                </>
            )}
        >
            <ChannelHeader
                channel={channel}
                channelName={name}
                guild={guild}
                parentChannel={parentChannel}
            />
        </HeaderBar>
    );
}

export const SplitSidePanel = ErrorBoundary.wrap(function SplitSidePanel() {
    const { guild, channel } = useStateFromStores(
        [SplitStore, GuildStore, ChannelStore],
        () => {
            const { channelId, guildId } = SplitStore.getState();
            return {
                guild: guildId ? GuildStore.getGuild(guildId) : null,
                channel: channelId ? ChannelStore.getChannel(channelId) : null,
            };
        },
        [],
    );

    const [channelSidebar, guildSidebar] = useStateFromStores(
        [ChannelSectionStore, SelectedChannelStore, SelectedGuildStore],
        () => {
            const currentChannelId = SelectedChannelStore.getChannelId();
            const currentGuildId = SelectedGuildStore.getGuildId();
            return [
                ChannelSectionStore.getSidebarState(currentChannelId),
                currentGuildId ? ChannelSectionStore.getGuildSidebarState(currentGuildId) : null,
            ];
        },
        [],
    );

    useEffect(() => {
        if (!channel?.id || MessageStore.getLastMessage(channel.id)) return;
        MessageActions.fetchMessages({ channelId: channel.id, limit: 50 });
    }, [channel?.id]);

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    useLayoutEffect(() => {
        const onResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const [view, setView] = useState<React.ReactNode>(null);

    useEffect(() => {
        if (!channel) {
            setView(null);
            return;
        }

        if (channel.isForumLikeChannel?.()) {
            setView(
                <div className={ChatClasses.loader}>
                    <WanderingCubesLoading />
                </div>,
            );
            requireForumView().then(() => {
                setView(
                    <ForumView channel={channel} guild={guild} sidebarState={null} />,
                );
            });
        } else {
            setView(
                <Chat
                    channel={channel}
                    guild={guild}
                    chatInputType={ChatInputTypes.SIDEBAR}
                />,
            );
        }
    }, [channel, guild]);

    if (!channel || channelSidebar || guildSidebar) return null;

    const ratio = Math.min(0.45, Math.max(0.2, settings.store.maxPanelWidthRatio || 0.31));
    const maxWidth = ~~(windowWidth * ratio);

    return (
        <SidebarComponents.Resize sidebarType={Sidebars.MessageRequestSidebar} maxWidth={maxWidth}>
            <div className={cl("panel")}>
                <SplitHeader guild={guild} channel={channel} />
                <div className={cl("body")}>{view}</div>
            </div>
        </SidebarComponents.Resize>
    );
}, { noop: true });

export function getMainChatChannelId() {
    const channelId = SelectedChannelStore.getChannelId();
    const sidebar = ChannelSectionStore.getSidebarState(channelId);
    if (sidebar && typeof sidebar === "object" && "channelId" in sidebar && typeof sidebar.channelId === "string") {
        return sidebar.channelId;
    }
    return channelId;
}
