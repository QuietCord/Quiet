#!/usr/bin/env node
/** Check that Discord PTB has Quiet embedded in every app-* folder. */
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { logPtbOnlyScope, PTB_EXE, PTB_ROOT } from "./discordPtb.mjs";

function asarSize(path) {
    if (!existsSync(path)) return 0;
    return statSync(path).size;
}

function getAllResources() {
    if (!existsSync(PTB_ROOT)) throw new Error("Discord PTB not installed");
    return readdirSync(PTB_ROOT, { withFileTypes: true })
        .filter(e => e.isDirectory() && e.name.startsWith("app-"))
        .map(e => ({ app: e.name, resources: join(PTB_ROOT, e.name, "resources") }))
        .filter(({ resources }) => existsSync(resources));
}

logPtbOnlyScope();

let ok = true;
for (const { app, resources } of getAllResources()) {
    const stub = join(resources, "app.asar");
    const backup = join(resources, "_app.asar");
    const patcher = join(resources, "_vencord", "patcher.js");
    const hasApp = existsSync(stub) || existsSync(backup);

    if (!hasApp) {
        console.log(`${app}: no app.asar (incomplete install?)`);
        continue;
    }

    const patched = existsSync(patcher) && asarSize(stub) > 0 && asarSize(stub) < 100_000;
    const vanilla = asarSize(stub) >= 100_000 && !existsSync(patcher);

    if (patched) {
        const head = readFileSync(patcher, "utf-8").slice(0, 200);
        const brand = head.includes("Quiet") || head.includes("Vencord") ? "mod" : "unknown bundle";
        console.log(`${app}: PATCHED (stub ${asarSize(stub)} B, _vencord ${brand})`);
    } else if (vanilla) {
        console.log(`${app}: vanilla (not injected)`);
        ok = false;
    } else {
        console.log(`${app}: UNKNOWN state — stub=${asarSize(stub)} backup=${asarSize(backup)} _vencord=${existsSync(patcher)}`);
        ok = false;
    }
}

const running = readdirSync(PTB_ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith("app-"))
    .map(e => join(PTB_ROOT, e.name, PTB_EXE))
    .filter(existsSync);

console.log("\nPTB executables:", running.map(p => p.replace(PTB_ROOT + "\\", "")).join(", ") || "none");

process.exit(ok ? 0 : 1);
