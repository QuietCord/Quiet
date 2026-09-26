/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import faviconDataUrl from "file://../../assets/brand/favicon.ico?base64";
import logoDataUrl from "file://../../assets/brand/logo.png?base64";
import { app, BrowserWindow, nativeImage, NativeImage } from "electron";

let cachedIcon: NativeImage | null = null;

export function getQuietAppIcon(): NativeImage {
    if (!cachedIcon) {
        let icon = nativeImage.createFromDataURL(logoDataUrl);
        if (icon.isEmpty()) {
            icon = nativeImage.createFromDataURL(faviconDataUrl);
        }
        if (process.platform === "win32" && !icon.isEmpty()) {
            const { width, height } = icon.getSize();
            if (width < 256 || height < 256) {
                icon = icon.resize({ width: 256, height: 256, quality: "best" });
            }
        }
        cachedIcon = icon;
    }
    return cachedIcon;
}

/** Discord resets the window icon after startup — keep the Quiet logo on taskbar/titlebar. */
export function pinQuietIconOnWindow(win: BrowserWindow) {
    const icon = getQuietAppIcon();
    if (icon.isEmpty()) {
        console.warn("[Quiet] brand icon failed to load");
        return;
    }

    const apply = () => {
        try {
            win.setIcon(icon);
        } catch (err) {
            console.error("[Quiet] setIcon failed", err);
        }
    };

    apply();

    const originalSetIcon = win.setIcon.bind(win);
    win.setIcon = (image?: NativeImage | string) => {
        if (!getQuietAppIcon().isEmpty()) {
            return originalSetIcon(getQuietAppIcon());
        }
        return originalSetIcon(image as NativeImage);
    };

    win.on("show", apply);
    win.on("focus", apply);
}

export function applyQuietAppIcon() {
    const icon = getQuietAppIcon();
    const proto = BrowserWindow.prototype as BrowserWindow & { setIcon: typeof BrowserWindow.prototype.setIcon; };
    const originalProtoSetIcon = proto.setIcon;

    if (!icon.isEmpty()) {
        proto.setIcon = function (this: BrowserWindow, image?: NativeImage | string) {
            return originalProtoSetIcon.call(this, getQuietAppIcon());
        };
    }

    app.on("browser-window-created", (_, win: BrowserWindow) => {
        pinQuietIconOnWindow(win);
    });

    app.whenReady().then(() => {
        const icon = getQuietAppIcon();
        if (icon.isEmpty()) return;
        if (process.platform === "darwin" && app.dock) {
            app.dock.setIcon(icon);
        }
    });
}
