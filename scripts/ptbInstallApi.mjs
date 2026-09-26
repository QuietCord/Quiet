/**
 * Quiet — PTB embed install API (CLI + GUI installer)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { createRequire } from "module";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import {
    getAllPtbResources,
    handleDiscordPtbBeforePatch,
    isWindowsProcessRunning,
    logPtbOnlyScope,
    PTB_EXE,
    PTB_ROOT,
    quitDiscordPtb,
} from "./discordPtb.mjs";

const require = createRequire(import.meta.url);
const { createPackage } = require("@electron/asar");

export const DIST_FILES = ["patcher.js", "preload.js", "renderer.js", "renderer.css"];

export const PTB_DOWNLOAD_URL = "https://discord.com/download#ptb-experiment";

export const INSTALLER_COPY = {
    tagline: "Performance & attention-first Discord",
    productName: "QuietCord",
    clientName: "Quiet",
    ptbOnlyNote: "QuietCord only patches Discord PTB — never Discord stable.",
    hubHint: "Settings → Quiet Hub (casita icon)",
    cloudHint: "Settings → Cloud to opt in to sync and telemetry",
    websiteUrl: "https://github.com/QuietCord/Quiet",
    cloudPrivacyUrl: "https://github.com/QuietCord/Backend/blob/main/docs/CLOUD-PRIVACY.md",
};

const STUB_MAIN = `require(require("path").join(process.resourcesPath, "_vencord", "patcher.js"));`;

export function defaultRepoRoot() {
    return join(dirname(fileURLToPath(import.meta.url)), "..");
}

function asarSize(path) {
    if (!existsSync(path)) return 0;
    return statSync(path).size;
}

export function isPtbInstalled() {
    try {
        return existsSync(PTB_ROOT) && getAllPtbResources().length > 0;
    } catch {
        return false;
    }
}

export function isPtbRunning() {
    return process.platform === "win32" && isWindowsProcessRunning(PTB_EXE);
}

export function getDistStatus(distDir) {
    const missing = DIST_FILES.filter(f => !existsSync(join(distDir, f)));
    return { ready: missing.length === 0, missing, distDir };
}

function readPatcherBrand(resources) {
    const patcher = join(resources, "_vencord", "patcher.js");
    if (!existsSync(patcher)) return "none";
    const head = readFileSync(patcher, "utf-8").slice(0, 400);
    if (head.includes("Quiet")) return "quiet";
    if (head.includes("Vencord")) return "vencord";
    return "unknown";
}

/**
 * @returns {{ ok: boolean, ptbInstalled: boolean, apps: Array<{ app: string, state: "patched"|"vanilla"|"unknown"|"incomplete", detail: string }>, summary: "PATCHED"|"VANILLA"|"PARTIAL"|"NO_PTB" }}
 */
export function verifyPtbInstall() {
    if (!existsSync(PTB_ROOT)) {
        return { ok: false, ptbInstalled: false, apps: [], summary: "NO_PTB" };
    }

    const entries = readdirSync(PTB_ROOT, { withFileTypes: true })
        .filter(e => e.isDirectory() && e.name.startsWith("app-"))
        .map(e => ({ app: e.name, resources: join(PTB_ROOT, e.name, "resources") }))
        .filter(({ resources }) => existsSync(resources));

    if (!entries.length) {
        return { ok: false, ptbInstalled: false, apps: [], summary: "NO_PTB" };
    }

    const apps = [];
    let patchedCount = 0;
    let vanillaCount = 0;

    for (const { app, resources } of entries) {
        const stub = join(resources, "app.asar");
        const backup = join(resources, "_app.asar");
        const patcher = join(resources, "_vencord", "patcher.js");
        const hasApp = existsSync(stub) || existsSync(backup);

        if (!hasApp) {
            apps.push({ app, state: "incomplete", detail: "Missing app.asar" });
            continue;
        }

        const patched = existsSync(patcher) && asarSize(stub) > 0 && asarSize(stub) < 100_000;
        const vanilla = asarSize(stub) >= 100_000 && !existsSync(patcher);

        if (patched) {
            patchedCount++;
            const brand = readPatcherBrand(resources);
            apps.push({
                app,
                state: "patched",
                detail: `Stub ${asarSize(stub)} B · bundle ${brand}`,
            });
        } else if (vanilla) {
            vanillaCount++;
            apps.push({ app, state: "vanilla", detail: "Not injected" });
        } else {
            apps.push({
                app,
                state: "unknown",
                detail: `stub=${asarSize(stub)} backup=${asarSize(backup)} _vencord=${existsSync(patcher)}`,
            });
        }
    }

    let summary = "PARTIAL";
    let ok = false;
    if (patchedCount === entries.length) {
        summary = "PATCHED";
        ok = true;
    } else if (vanillaCount === entries.length) {
        summary = "VANILLA";
    } else if (patchedCount > 0) {
        summary = "PARTIAL";
    }

    return { ok, ptbInstalled: true, apps, summary, ptbRunning: isPtbRunning() };
}

function ensureVanillaBackup(resources) {
    const appAsar = join(resources, "app.asar");
    const backup = join(resources, "_app.asar");

    if (!existsSync(appAsar)) throw new Error(`Missing app.asar in ${resources} — reinstall Discord PTB`);

    const appSize = asarSize(appAsar);
    if (appSize > 0 && appSize < 100_000) {
        if (!existsSync(backup) || asarSize(backup) < 100_000)
            throw new Error(`Broken PTB stub in ${resources}. Run restore first.`);
        return;
    }

    if (existsSync(backup) && asarSize(backup) >= 100_000) return;

    writeFileSync(backup, readFileSync(appAsar));
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

function embedDist(resources, distDir) {
    const target = join(resources, "_vencord");
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    for (const f of DIST_FILES) {
        const src = join(distDir, f);
        if (!existsSync(src)) throw new Error(`Missing dist/${f} — build Quiet first`);
        cpSync(src, join(target, f));
    }
}

function verifyPatch(resources) {
    const vencord = join(resources, "_vencord", "patcher.js");
    const stub = join(resources, "app.asar");
    const backup = join(resources, "_app.asar");
    if (!existsSync(vencord)) throw new Error(`Verify failed: no _vencord in ${resources}`);
    if (asarSize(stub) >= 100_000) throw new Error(`Verify failed: app.asar still full size in ${resources}`);
    if (asarSize(stub) < 200) throw new Error(`Verify failed: app.asar stub too small in ${resources}`);
    if (asarSize(backup) < 100_000) throw new Error(`Verify failed: missing _app.asar backup in ${resources}`);
}

async function installOne(resources, distDir, log = console.log) {
    log(`Installing Quiet to: ${resources}`);
    ensureVanillaBackup(resources);
    embedDist(resources, distDir);
    await packStubAsar(join(resources, "app.asar"));
    verifyPatch(resources);
}

/**
 * Full install: stub + _vencord bundle (all app-* folders).
 */
export async function runEmbeddedInstall(options = {}) {
    const { distDir = join(defaultRepoRoot(), "dist"), quitFirst = true, log = console.log } = options;
    const dist = getDistStatus(distDir);
    if (!dist.ready) throw new Error(`Missing build files: ${dist.missing.join(", ")}`);

    logPtbOnlyScope();
    if (quitFirst) handleDiscordPtbBeforePatch();

    const resourcesList = getAllPtbResources();
    log(`Patching ${resourcesList.length} Discord PTB app folder(s)...`);
    for (const resources of resourcesList) await installOne(resources, distDir, log);

    return verifyPtbInstall();
}

function syncOne(resources, distDir, log = console.log) {
    const vencord = join(resources, "_vencord");
    if (!existsSync(vencord)) {
        log(`Skip (not injected yet): ${resources}`);
        return false;
    }
    for (const f of DIST_FILES) {
        cpSync(join(distDir, f), join(vencord, f));
    }
    log(`Synced bundle: ${vencord}`);
    return true;
}

/**
 * Re-copy renderer/patcher bundle only (Hub/plugins fix when stub already OK).
 */
export function runReinstallBundle(options = {}) {
    const { distDir = join(defaultRepoRoot(), "dist"), quitFirst = false, log = console.log } = options;
    const dist = getDistStatus(distDir);
    if (!dist.ready) throw new Error(`Missing build files: ${dist.missing.join(", ")}`);

    logPtbOnlyScope();
    if (quitFirst && process.env.QUIET_QUIT_PTB === "1") quitDiscordPtb();

    let n = 0;
    for (const resources of getAllPtbResources()) {
        if (syncOne(resources, distDir, log)) n++;
    }
    if (n === 0) throw new Error("Nothing synced — run full Install first");

    return { syncedFolders: n, verify: verifyPtbInstall() };
}

function restoreOne(resources, log = console.log) {
    const appAsar = join(resources, "app.asar");
    const backup = join(resources, "_app.asar");
    const vencord = join(resources, "_vencord");

    if (existsSync(backup) && asarSize(backup) >= 100_000) {
        writeFileSync(appAsar, readFileSync(backup));
        log(`Restored vanilla app.asar: ${resources}`);
    } else if (asarSize(appAsar) >= 100_000) {
        log(`Already vanilla: ${resources}`);
    } else {
        log(`Skip restore (missing backup): ${resources}`);
    }

    if (existsSync(vencord)) {
        rmSync(vencord, { recursive: true, force: true });
        log(`Removed _vencord: ${resources}`);
    }
}

export function runRestoreVanilla(options = {}) {
    const { quitFirst = true, log = console.log } = options;
    logPtbOnlyScope();
    if (quitFirst) handleDiscordPtbBeforePatch();
    for (const resources of getAllPtbResources()) restoreOne(resources, log);
    return verifyPtbInstall();
}

export function launchDiscordPtb() {
    if (process.platform !== "win32") throw new Error("PTB launch is supported on Windows only");
    const apps = readdirSync(PTB_ROOT, { withFileTypes: true })
        .filter(e => e.isDirectory() && e.name.startsWith("app-"))
        .map(e => join(PTB_ROOT, e.name, PTB_EXE))
        .filter(existsSync);
    apps.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    const exe = apps[0];
    if (!exe) throw new Error("Discord PTB executable not found");
    spawn(exe, [], { detached: true, stdio: "ignore" }).unref();
    return exe;
}
