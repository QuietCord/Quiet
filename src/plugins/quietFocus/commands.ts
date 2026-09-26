/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import type { CommandArgument, CommandContext } from "@vencord/discord-types";

import { endFocus, getFocusSession, startFocus, toggleFocus } from "./focusState";
import { settings } from "./settings";

const MODE_OPTIONS = [
    { label: "Toggle", value: "toggle" },
    { label: "Minimal UI (until off)", value: "minimal" },
    { label: "DMs + @mentions (timed)", value: "dms" },
    { label: "Off", value: "off" },
] as const;

function sessionLine() {
    const s = getFocusSession();
    if (!s.active) return "Focus Mode is **off**.";
    const mins = s.expiresAt ? Math.ceil((s.expiresAt - Date.now()) / 60_000) : null;
    const scope = s.dmsAndMentions ? "DMs + mentions" : "minimal UI";
    const time = mins != null && mins > 0 ? ` · ~${mins}m left` : " · until you turn it off";
    return `Focus Mode is **on** (${scope}${time}).`;
}

export const focusCommands = [{
    name: "focus",
    description: "Toggle Quiet Focus Mode — minimal Discord UI or a timed DMs + mentions session.",
    inputType: ApplicationCommandInputType.BUILT_IN,
    options: [
        {
            name: "mode",
            description: "What to do (default: toggle)",
            required: false,
            type: ApplicationCommandOptionType.STRING,
            choices: MODE_OPTIONS.map(({ label, value }) => ({ name: label, value })),
        },
        {
            name: "minutes",
            description: "Session length for timed modes (default from plugin settings)",
            required: false,
            type: ApplicationCommandOptionType.INTEGER,
        },
    ],
    execute: async (args: CommandArgument[], ctx: CommandContext) => {
        const mode = findOption<string>(args, "mode", "toggle");
        const minutes = findOption<number>(args, "minutes", settings.store.sessionDurationMin || 60);

        switch (mode) {
            case "off":
                endFocus();
                break;
            case "minimal":
                startFocus({ dmsAndMentions: false, durationMin: 0 });
                break;
            case "dms":
                startFocus({
                    dmsAndMentions: true,
                    durationMin: Math.max(0, minutes),
                });
                break;
            case "toggle":
            default:
                toggleFocus();
                break;
        }

        sendBotMessage(ctx.channel.id, { content: sessionLine() });
    },
}];
