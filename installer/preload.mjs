/*
 * QuietCord Installer — preload
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("quietInstaller", {
    getBootstrap: () => ipcRenderer.invoke("quiet:get-bootstrap"),
    getStatus: () => ipcRenderer.invoke("quiet:get-status"),
    install: () => ipcRenderer.invoke("quiet:install"),
    reinstallBundle: () => ipcRenderer.invoke("quiet:reinstall-bundle"),
    uninstall: () => ipcRenderer.invoke("quiet:uninstall"),
    launchPtb: () => ipcRenderer.invoke("quiet:launch-ptb"),
    openExternal: (url) => ipcRenderer.invoke("quiet:open-external", url),
});
