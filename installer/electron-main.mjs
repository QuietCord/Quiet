/*
 * QuietCord Installer — Electron main process
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { app, BrowserWindow, ipcMain, nativeImage, shell } from "electron";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

import {
    getDistStatus,
    INSTALLER_COPY,
    isPtbInstalled,
    launchDiscordPtb,
    PTB_DOWNLOAD_URL,
    runEmbeddedInstall,
    runReinstallBundle,
    runRestoreVanilla,
    verifyPtbInstall,
} from "../scripts/ptbInstallApi.mjs";

const INSTALLER_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(INSTALLER_DIR, "..");

function getDistDir() {
    if (app.isPackaged) return join(process.resourcesPath, "quiet-dist");
    return join(REPO_ROOT, "dist");
}

function getLogoPath() {
    const png = join(REPO_ROOT, "assets", "brand", "logo.png");
    return existsSync(png) ? png : null;
}

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
    const iconPath = getLogoPath();
    mainWindow = new BrowserWindow({
        width: 520,
        height: 680,
        minWidth: 480,
        minHeight: 620,
        title: `${INSTALLER_COPY.productName} Installer`,
        autoHideMenuBar: true,
        icon: iconPath ? nativeImage.createFromPath(iconPath) : undefined,
        webPreferences: {
            preload: join(INSTALLER_DIR, "preload.mjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.loadFile(join(INSTALLER_DIR, "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("quiet:get-bootstrap", () => ({
    copy: INSTALLER_COPY,
    ptbDownloadUrl: PTB_DOWNLOAD_URL,
    distDir: getDistDir(),
    packaged: app.isPackaged,
    logoUrl: (() => {
        const p = getLogoPath();
        return p ? pathToFileURL(p).href : null;
    })(),
}));

ipcMain.handle("quiet:get-status", () => ({
    ptbInstalled: isPtbInstalled(),
    dist: getDistStatus(getDistDir()),
    verify: verifyPtbInstall(),
}));

ipcMain.handle("quiet:open-external", (_e, url) => {
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) return false;
    void shell.openExternal(url);
    return true;
});

ipcMain.handle("quiet:install", async () => {
    const logs = [];
    const log = (line) => logs.push(line);
    try {
        const verify = await runEmbeddedInstall({ distDir: getDistDir(), quitFirst: true, log });
        return { ok: true, verify, logs };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err), logs };
    }
});

ipcMain.handle("quiet:reinstall-bundle", async () => {
    const logs = [];
    const log = (line) => logs.push(line);
    try {
        const result = runReinstallBundle({ distDir: getDistDir(), quitFirst: false, log });
        return { ok: true, ...result, logs };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err), logs };
    }
});

ipcMain.handle("quiet:uninstall", async () => {
    const logs = [];
    const log = (line) => logs.push(line);
    try {
        const verify = runRestoreVanilla({ quitFirst: true, log });
        return { ok: true, verify, logs };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err), logs };
    }
});

ipcMain.handle("quiet:launch-ptb", () => {
    try {
        const exe = launchDiscordPtb();
        return { ok: true, exe };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
});
