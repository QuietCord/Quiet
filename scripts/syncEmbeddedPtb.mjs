#!/usr/bin/env node
/**
 * Copy dist/ into Discord PTB resources/_vencord only (no app.asar).
 * Does NOT kill PTB by default — use Ctrl+R after renderer sync. Set QUIET_QUIT_PTB=1 to force quit first.
 */
import { cpSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getAllPtbResources, isWindowsProcessRunning, logPtbOnlyScope, PTB_EXE, quitDiscordPtb } from "./discordPtb.mjs";

const BASE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(BASE_DIR, "dist");
const FILES = ["patcher.js", "preload.js", "renderer.js", "renderer.css"];

function syncOne(resources) {
    const vencord = join(resources, "_vencord");
    if (!existsSync(vencord)) {
        console.warn(`Skip (not injected yet): ${resources} — run pnpm inject:ptb once`);
        return false;
    }
    for (const f of FILES) {
        const src = join(DIST, f);
        if (!existsSync(src)) throw new Error(`Missing dist/${f} — run pnpm build first`);
        cpSync(src, join(vencord, f));
    }
    console.log("Synced:", vencord);
    return true;
}

logPtbOnlyScope();
if (process.env.QUIET_QUIT_PTB === "1") {
    quitDiscordPtb();
} else if (process.platform === "win32" && isWindowsProcessRunning(PTB_EXE)) {
    console.log("[Quiet] PTB left running — press Ctrl+R in Discord to load renderer changes. Restart PTB only after patcher/preload changes.");
}

let n = 0;
for (const resources of getAllPtbResources()) {
    if (syncOne(resources)) n++;
}
if (n === 0) {
    console.error("Nothing synced. Run pnpm inject:ptb first.");
    process.exit(1);
}
