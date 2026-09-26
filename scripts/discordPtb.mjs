/**
 * Discord PTB paths and process helpers for Quiet.
 * Never touches Discord stable (%LOCALAPPDATA%\\Discord, Discord.exe).
 */
import { execFileSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

export const PTB_ROOT = join(process.env.LOCALAPPDATA, "DiscordPTB");
/** Windows image name for PTB only — not Discord.exe / DiscordCanary.exe */
export const PTB_EXE = "DiscordPTB.exe";

export function logPtbOnlyScope() {
    console.log(`[Quiet] Discord PTB only (${PTB_ROOT}). Discord stable is not modified or closed.`);
}

/** @returns {string[]} */
export function getAllPtbResources() {
    if (!existsSync(PTB_ROOT)) throw new Error("Discord PTB not installed");
    const entries = readdirSync(PTB_ROOT, { withFileTypes: true })
        .filter(e => e.isDirectory() && e.name.startsWith("app-"))
        .map(e => join(PTB_ROOT, e.name, "resources"))
        .filter(r => existsSync(r) && (existsSync(join(r, "app.asar")) || existsSync(join(r, "_app.asar"))));
    if (!entries.length) throw new Error("Discord PTB resources not found");
    entries.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    return entries;
}

/** @param {string} imageName e.g. DiscordPTB.exe */
export function isWindowsProcessRunning(imageName) {
    if (process.platform !== "win32") return false;
    try {
        const out = execFileSync("tasklist", ["/FI", `IMAGENAME eq ${imageName}`, "/NH"], { encoding: "utf8" });
        return out.includes(imageName);
    } catch {
        return false;
    }
}

/** Warn if PTB is open; optionally quit PTB only when QUIET_QUIT_PTB=1 (never Discord.exe). */
export function handleDiscordPtbBeforePatch() {
    if (process.platform !== "win32") return;

    if (isWindowsProcessRunning(PTB_EXE)) {
        if (process.env.QUIET_QUIT_PTB === "1") {
            console.log(`Closing ${PTB_EXE} only (Discord stable untouched)...`);
            try {
                execFileSync("taskkill", ["/IM", PTB_EXE, "/F"], { stdio: "inherit" });
            } catch {
                console.warn(`Could not close ${PTB_EXE}; close it from the tray and re-run.`);
            }
        } else {
            console.warn(
                `${PTB_EXE} is still running. Close Discord PTB from the tray (not Discord stable), ` +
                "or set QUIET_QUIT_PTB=1 to quit PTB only before patching."
            );
        }
    }
}

/**
 * @param {string[]} args installer CLI args after `--`
 * @returns {string[]}
 */
export function ensureQuietPtbInstallerArgs(args) {
    const branchIdx = args.indexOf("--branch");
    if (branchIdx !== -1) {
        const branch = args[branchIdx + 1];
        if (branch !== "ptb") {
            console.error("[Quiet] This fork targets Discord PTB only. Use --branch ptb or pnpm inject:ptb.");
            process.exit(1);
        }
        return args;
    }

    if (args.includes("--install") || args.includes("--uninstall"))
        return [...args, "--branch", "ptb"];

    return args;
}
