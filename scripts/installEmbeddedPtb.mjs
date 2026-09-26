#!/usr/bin/env node
/**
 * Embed Quiet into Discord PTB (Windows): copies dist/ to resources/_vencord
 * and builds a valid app.asar stub via @electron/asar.
 * Patches every app-* folder so Squirrel updates do not leave an unpatched copy running.
 */
import { createRequire } from "module";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getAllPtbResources, handleDiscordPtbBeforePatch, logPtbOnlyScope } from "./discordPtb.mjs";

const require = createRequire(import.meta.url);
const { createPackage } = require("@electron/asar");

const BASE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(BASE_DIR, "dist");
const FILES = ["patcher.js", "preload.js", "renderer.js", "renderer.css"];

const STUB_MAIN = `require(require("path").join(process.resourcesPath, "_vencord", "patcher.js"));`;

function asarSize(path) {
    if (!existsSync(path)) return 0;
    return statSync(path).size;
}

function ensureVanillaBackup(resources) {
    const appAsar = join(resources, "app.asar");
    const backup = join(resources, "_app.asar");

    if (!existsSync(appAsar)) throw new Error(`Missing app.asar in ${resources} — reinstall Discord PTB`);

    const appSize = asarSize(appAsar);
    if (appSize > 0 && appSize < 100_000) {
        if (!existsSync(backup) || asarSize(backup) < 100_000)
            throw new Error(`Broken PTB stub in ${resources}. Run: pnpm restore:ptb`);
        return;
    }

    if (existsSync(backup) && asarSize(backup) >= 100_000) return;

    writeFileSync(backup, readFileSync(appAsar));
    console.log("Backed up vanilla Discord PTB to _app.asar:", resources);
}

async function packStubAsar(appAsarPath) {
    const stubDir = mkdtempSync(join(tmpdir(), "quiet-stub-"));
    try {
        writeFileSync(join(stubDir, "index.js"), STUB_MAIN);
        writeFileSync(join(stubDir, "package.json"), "{\n\t\"name\": \"discord\",\n\t\"main\": \"index.js\"\n}\n");
        rmSync(appAsarPath, { force: true });
        await createPackage(stubDir, appAsarPath);
    } finally {
        rmSync(stubDir, { recursive: true, force: true });
    }
}

function embedDist(resources) {
    const target = join(resources, "_vencord");
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    for (const f of FILES) {
        const src = join(DIST, f);
        if (!existsSync(src)) throw new Error(`Missing dist/${f} — run pnpm build first`);
        cpSync(src, join(target, f));
    }
}

function verifyPatch(resources) {
    const vencord = join(resources, "_vencord", "patcher.js");
    const stub = join(resources, "app.asar");
    const backup = join(resources, "_app.asar");
    if (!existsSync(vencord)) throw new Error(`Verify failed: no _vencord in ${resources}`);
    if (asarSize(stub) >= 100_000) throw new Error(`Verify failed: app.asar still full size in ${resources}`);
    if (asarSize(stub) < 200) throw new Error(`Verify failed: app.asar stub too small (broken asar?) in ${resources}`);
    if (asarSize(backup) < 100_000) throw new Error(`Verify failed: missing _app.asar backup in ${resources}`);
}

async function installOne(resources) {
    console.log("\nInstalling Quiet to:", resources);
    ensureVanillaBackup(resources);
    embedDist(resources);
    await packStubAsar(join(resources, "app.asar"));
    verifyPatch(resources);
    console.log("OK:", resources);
}

logPtbOnlyScope();
handleDiscordPtbBeforePatch();

const resourcesList = getAllPtbResources();
console.log(`Patching ${resourcesList.length} Discord PTB app folder(s)...`);
for (const resources of resourcesList) await installOne(resources);
console.log("\nDone. Fully quit Discord PTB (tray), then reopen. If it fails to start: pnpm restore:ptb");
