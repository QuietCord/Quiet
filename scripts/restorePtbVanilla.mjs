#!/usr/bin/env node
/** Restore Discord PTB to vanilla (undo Quiet embed) for every app-* folder. */
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { getAllPtbResources, handleDiscordPtbBeforePatch, logPtbOnlyScope } from "./discordPtb.mjs";

function asarSize(path) {
    if (!existsSync(path)) return 0;
    return statSync(path).size;
}

function restoreOne(resources) {
    const appAsar = join(resources, "app.asar");
    const backup = join(resources, "_app.asar");
    const vencord = join(resources, "_vencord");

    if (existsSync(backup) && asarSize(backup) >= 100_000) {
        writeFileSync(appAsar, readFileSync(backup));
        console.log("Restored vanilla app.asar from _app.asar:", resources);
    } else if (asarSize(appAsar) >= 100_000) {
        console.log("Already vanilla (full app.asar):", resources);
    } else {
        console.warn("Skip (cannot restore, missing backup):", resources);
    }

    if (existsSync(vencord)) {
        rmSync(vencord, { recursive: true, force: true });
        console.log("Removed _vencord:", resources);
    }
}

logPtbOnlyScope();
handleDiscordPtbBeforePatch();
for (const resources of getAllPtbResources()) restoreOne(resources);
console.log("\nDiscord PTB should open normally now.");
