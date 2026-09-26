#!/usr/bin/env node
/**
 * Copy dist/ into Discord PTB resources/_vencord only (no app.asar).
 * Closes Discord PTB first unless QUIET_KEEP_PTB=1.
 */
import { cpSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getAllPtbResources, logPtbOnlyScope, quitDiscordPtb, shouldKeepPtbRunning } from "./discordPtb.mjs";

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
if (!shouldKeepPtbRunning()) quitDiscordPtb();
let n = 0;
for (const resources of getAllPtbResources()) {
    if (syncOne(resources)) n++;
}
if (n === 0) {
    console.error("Nothing synced. Run pnpm inject:ptb first.");
    process.exit(1);
}
console.log("\nRestart Discord PTB (pnpm start:ptb) or reopen from tray — full quit applied before sync unless QUIET_KEEP_PTB=1.");
