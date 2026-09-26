/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { find, filters } from "@webpack";
import { React } from "@webpack/common";

import { settings } from "../settings";

const logger = new Logger("QuietPerformance/ReactProfiler");

export interface ComponentRenderStat {
    name: string;
    renders: number;
    totalMs: number;
    maxMs: number;
}

const stats = new Map<string, ComponentRenderStat>();

const TARGETS: Array<{ name: string; code: string[]; exports: string[]; }> = [
    { name: "Message", code: ["Message must not be a thread starter message"], exports: ["Z", "default"] },
    { name: "Avatar", code: ["isAvatarDecorationAnimating:"], exports: ["Z", "default"] },
    { name: "ChannelRow", code: ["UNREAD_IMPORTANT", "channelRow"], exports: ["Z", "default"] },
    { name: "MemberListItem", code: ["memberListItem", "isMobileOnline"], exports: ["Z", "default"] },
];

let installed = false;

function onRender(id: string, _phase: "mount" | "update", actualDuration: number) {
    const prev = stats.get(id) ?? { name: id, renders: 0, totalMs: 0, maxMs: 0 };
    prev.renders++;
    prev.totalMs += actualDuration;
    prev.maxMs = Math.max(prev.maxMs, actualDuration);
    stats.set(id, prev);
}

function wrapExport(mod: Record<string, unknown>, exportName: string, displayName: string) {
    const raw = mod[exportName];
    if (typeof raw !== "function") return;
    const fn = raw as React.ComponentType<Record<string, unknown>> & { __quietRenderProfiler?: boolean; };
    if (fn.__quietRenderProfiler) return;
    const Wrapped = (props: Record<string, unknown>) => (
        React.createElement(
            React.Profiler,
            { id: displayName, onRender: (id, phase, _a, _b, duration) => onRender(id, phase, duration) },
            React.createElement(fn, props),
        )
    );
    Wrapped.__quietRenderProfiler = true;
    mod[exportName] = Wrapped;
}

export function installReactRenderProfiler() {
    if (installed || !settings.store.reactRenderProfiler) return;
    installed = true;
    let wrapped = 0;
    for (const t of TARGETS) {
        try {
            const mod = find(filters.byCode(...t.code), { isIndirect: true }) as Record<string, unknown> | null;
            if (!mod) continue;
            for (const ex of t.exports) {
                if (mod[ex]) {
                    wrapExport(mod, ex, t.name);
                    wrapped++;
                }
            }
        } catch (e) {
            logger.debug(`Skip ${t.name}`, e);
        }
    }
    logger.info(`React render profiler wrapped ${wrapped} exports`);
}

export function getReactRenderStats(): ComponentRenderStat[] {
    return [...stats.values()].sort((a, b) => b.renders - a.renders);
}

export function clearReactRenderStats() {
    stats.clear();
}

export function formatReactRenderStatsLines(limit = 6) {
    return getReactRenderStats()
        .slice(0, limit)
        .map(s => `${s.name}: ${s.renders} renders · ${Math.round(s.totalMs)} ms total`);
}
