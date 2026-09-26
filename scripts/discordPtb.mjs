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

/** Skip auto-quit when set (e.g. sync while PTB stays open for Ctrl+R only). */
export function shouldKeepPtbRunning() {
    return process.env.QUIET_KEEP_PTB === "1";
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
        return out.toLowerCase().includes(imageName.toLowerCase());
    } catch {
        return false;
    }
}

function sleepMs(ms) {
    if (process.platform === "win32") {
        try {
            execFileSync("ping", ["127.0.0.1", "-n", "1", "-w", String(Math.max(1, ms))], { stdio: "ignore" });
            return;
        } catch { /* fall through */ }
    }
    const end = Date.now() + ms;
    while (Date.now() < end) { /* busy */ }
}

/**
 * Force-close Discord PTB only (never Discord.exe). Waits until the process is gone.
 * @returns {boolean} true if PTB was running and is now closed (or was already closed)
 */
export function quitDiscordPtb(options = {}) {
    const { timeoutMs = 15_000 } = options;

    if (process.platform !== "win32") return false;

    if (!isWindowsProcessRunning(PTB_EXE)) return false;

    console.log(`[Quiet] Closing ${PTB_EXE} (Discord stable untouched)...`);
    try {
        execFileSync("taskkill", ["/IM", PTB_EXE, "/F", "/T"], { stdio: "ignore" });
    } catch {
        console.warn(`[Quiet] taskkill could not stop ${PTB_EXE}; close it from the tray and retry.`);
        return false;
    }

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (!isWindowsProcessRunning(PTB_EXE)) {
            console.log("[Quiet] Discord PTB closed.");
            return true;
        }
        sleepMs(250);
    }

    console.warn(`[Quiet] ${PTB_EXE} still running after ${timeoutMs}ms — close from tray manually.`);
    return false;
}

/** Before inject/restore: quit PTB unless QUIET_KEEP_PTB=1. Legacy QUIET_QUIT_PTB=1 still forces quit. */
export function handleDiscordPtbBeforePatch() {
    if (process.platform !== "win32") return;

    const forceQuit =
        process.env.QUIET_QUIT_PTB === "1"
        || !shouldKeepPtbRunning();

    if (!isWindowsProcessRunning(PTB_EXE)) return;

    if (forceQuit) {
        quitDiscordPtb();
    } else {
        console.warn(
            `${PTB_EXE} is still running. Set QUIET_KEEP_PTB=0 (default) to auto-close, or close PTB from the tray.`
        );
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
