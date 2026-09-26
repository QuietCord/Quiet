/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { findByCodeLazy } from "@webpack";
import { React } from "@webpack/common";

import { settings } from "../settings";
import { recordOptimizationError } from "./optimizationSafety";

const logger = new Logger("QuietPerformance/ReactHotPath");

type AnyProps = Record<string, unknown>;
type AnyComponent = React.ComponentType<AnyProps>;

const MESSAGE_MARK = "__quietPerfMemoMessage";
const AVATAR_MARK = "__quietPerfMemoAvatar";

const MessageModule = findByCodeLazy("Message must not be a thread starter message");
const AvatarModule = findByCodeLazy("isAvatarDecorationAnimating:");

function messagePropsEqual(a: AnyProps, b: AnyProps) {
    const ma = a.message as { id?: string; edited_timestamp?: string | null; content?: string; flags?: number; embeds?: unknown[]; attachments?: unknown[]; } | undefined;
    const mb = b.message as typeof ma;
    if (ma?.id !== mb?.id) return false;
    if (ma?.edited_timestamp !== mb?.edited_timestamp) return false;
    if (ma?.content !== mb?.content) return false;
    if (ma?.flags !== mb?.flags) return false;
    if ((ma?.embeds?.length ?? 0) !== (mb?.embeds?.length ?? 0)) return false;
    if ((ma?.attachments?.length ?? 0) !== (mb?.attachments?.length ?? 0)) return false;
    if (a.compact !== b.compact) return false;
    if (a.grouped !== b.grouped) return false;
    return true;
}

function avatarPropsEqual(a: AnyProps, b: AnyProps) {
    const ua = a.user as { id?: string; } | undefined;
    const ub = b.user as { id?: string; } | undefined;
    if (ua?.id !== ub?.id) return false;
    if (a.size !== b.size) return false;
    if (a.guildId !== b.guildId) return false;
    if (a.avatarDecoration !== b.avatarDecoration) return false;
    if (a.isTyping !== b.isTyping) return false;
    if (a.status !== b.status) return false;
    return true;
}

function memoWrap(mod: Record<string, unknown>, exportNames: string[], compare: (a: AnyProps, b: AnyProps) => boolean, mark: string) {
    let wrapped = 0;
    for (const name of exportNames) {
        const raw = mod[name];
        if (typeof raw !== "function") continue;
        const fn = raw as AnyComponent & { [key: string]: unknown; };
        if (fn[mark]) continue;
        try {
            mod[name] = React.memo(fn, compare);
            (mod[name] as AnyComponent & { [key: string]: unknown; })[mark] = true;
            wrapped++;
        } catch (e) {
            recordOptimizationError("reactMemoHotPath", e);
        }
    }
    return wrapped;
}

export function installReactHotPathMemos() {
    if (!settings.store.reactMemoHotPath) return;

    try {
        if (settings.store.reactMemoMessage) {
            const mod = MessageModule as Record<string, unknown>;
            const n = memoWrap(mod, ["Z", "default", "Message"], messagePropsEqual, MESSAGE_MARK);
            if (n) logger.info(`memo-wrapped Message exports (${n})`);
        }
    } catch (e) {
        recordOptimizationError("reactMemoMessage", e);
        logger.warn("Message memo failed", e);
    }

    try {
        if (settings.store.reactMemoAvatar) {
            const mod = AvatarModule as Record<string, unknown>;
            const n = memoWrap(mod, ["Z", "default", "Avatar"], avatarPropsEqual, AVATAR_MARK);
            if (n) logger.info(`memo-wrapped Avatar exports (${n})`);
        }
    } catch (e) {
        recordOptimizationError("reactMemoAvatar", e);
        logger.warn("Avatar memo failed", e);
    }
}

export function syncReactHotPathMemos() {
    installReactHotPathMemos();
}
