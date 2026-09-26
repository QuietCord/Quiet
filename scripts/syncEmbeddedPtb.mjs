#!/usr/bin/env node
/**
 * Copy dist/ into Discord PTB resources/_vencord only (no app.asar, no taskkill).
 * Use after the first `pnpm inject:ptb`. Reload PTB with Ctrl+R to pick up changes.
 */
import { cpSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getAllPtbResources, logPtbOnlyScope } from "./discordPtb.mjs";

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
let n = 0;
for (const resources of getAllPtbResources()) {
    if (syncOne(resources)) n++;
}
if (n === 0) {
    console.error("Nothing synced. Run pnpm inject:ptb first.");
    process.exit(1);
}
console.log("\nReload Discord PTB (Ctrl+R) — no restart needed for renderer/plugin changes.");
