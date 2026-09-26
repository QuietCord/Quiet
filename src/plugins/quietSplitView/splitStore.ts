/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { proxyLazy } from "@utils/lazy";
import { OptionType } from "@utils/types";
import { Flux as TFlux } from "@vencord/discord-types";
import { ChannelActionCreators, Flux as FluxWP, FluxDispatcher } from "@webpack/common";

interface IFlux extends TFlux {
    PersistedStore: TFlux["Store"];
}

export const settings = definePluginSettings({
    persistPanel: {
        type: OptionType.BOOLEAN,
        description: "Restore the side panel channel after restarting Discord.",
        default: true,
    },
    defaultPinned: {
        type: OptionType.BOOLEAN,
        description: "New side panels start pinned (stay open when you change the main channel).",
        default: true,
    },
    maxPanelWidthRatio: {
        type: OptionType.NUMBER,
        description: "Max side panel width as a fraction of window width (0.2–0.45).",
        default: 0.31,
    },
    enableShortcut: {
        type: OptionType.BOOLEAN,
        description: "Enable keyboard shortcuts (Ctrl+Alt+S swap, Ctrl+Alt+\\ toggle panel).",
        default: true,
    },
});

export interface SplitPanelState {
    guildId: string;
    channelId: string;
    pinned: boolean;
}

export const SplitStore = proxyLazy(() => {
    const current: SplitPanelState = {
        guildId: "",
        channelId: "",
        pinned: false,
    };

    let previous: SplitPanelState = { ...current };

    class SplitPanelStore extends (FluxWP as IFlux).PersistedStore {
        static persistKey = "QuietSplitViewStore";

        // @ts-ignore
        initialize(previousState: Partial<SplitPanelState> | undefined) {
            if (!settings.store.persistPanel || !previousState?.channelId) return;
            current.guildId = previousState.guildId ?? "";
            current.channelId = previousState.channelId ?? "";
            current.pinned = previousState.pinned ?? settings.store.defaultPinned;
        }

        getState(): SplitPanelState {
            return { ...current };
        }
    }

    const store = new SplitPanelStore(FluxDispatcher, {
        // @ts-ignore
        async QUIET_SPLIT_OPEN({ guildId: newGId, id, pinned }: { guildId: string | null; id: string; pinned?: boolean; }) {
            previous = { ...current };
            current.guildId = newGId ?? "";
            current.pinned = pinned ?? settings.store.defaultPinned;

            if (current.guildId) {
                current.channelId = id;
            } else {
                current.channelId = await ChannelActionCreators.getOrEnsurePrivateChannel(id);
            }
            store.emitChange();
        },

        QUIET_SPLIT_CLOSE() {
            previous = { ...current };
            current.guildId = "";
            current.channelId = "";
            current.pinned = false;
            store.emitChange();
        },

        QUIET_SPLIT_SET_PIN({ pinned }: { pinned: boolean; }) {
            current.pinned = pinned;
            store.emitChange();
        },

        QUIET_SPLIT_RESTORE_PREVIOUS() {
            if (!previous.channelId) return;
            current.guildId = previous.guildId;
            current.channelId = previous.channelId;
            current.pinned = previous.pinned;
            store.emitChange();
        },
    });

    return store;
});

export function getSplitPanelState() {
    return SplitStore.getState();
}

export function isSplitPanelOpen() {
    return !!SplitStore.getState().channelId;
}

export function openInSplitView(guildId: string | null, id: string, opts?: { pinned?: boolean; }) {
    FluxDispatcher.dispatch({
        type: "QUIET_SPLIT_OPEN",
        guildId,
        id,
        pinned: opts?.pinned,
    });
}

export function closeSplitView() {
    FluxDispatcher.dispatch({ type: "QUIET_SPLIT_CLOSE" });
}

export function toggleSplitPin() {
    const { pinned } = SplitStore.getState();
    FluxDispatcher.dispatch({ type: "QUIET_SPLIT_SET_PIN", pinned: !pinned });
}

export function restorePreviousSplitView() {
    FluxDispatcher.dispatch({ type: "QUIET_SPLIT_RESTORE_PREVIOUS" });
}
