/*
 * QuietCord Installer — renderer
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** @type {import("./preload.mjs")} */
const api = window.quietInstaller;

let bootstrap = null;
let busy = false;

const $ = (id) => document.getElementById(id);

function setBusy(v) {
    busy = v;
    for (const id of ["btn-install", "btn-update", "btn-uninstall", "btn-reinstall-bundle"]) {
        const el = $(id);
        if (el) el.disabled = v;
    }
}

function showLog(lines) {
    const log = $("log");
    if (!lines?.length) {
        log.hidden = true;
        return;
    }
    log.hidden = false;
    log.textContent = lines.join("\n");
}

function summaryHeadline(verify) {
    switch (verify.summary) {
        case "PATCHED": return "QuietCord is installed (PATCHED)";
        case "VANILLA": return "Discord PTB is vanilla — not injected";
        case "PARTIAL": return "Partial install — repair recommended";
        default: return "Could not verify install";
    }
}

function dotClass(verify) {
    if (verify.summary === "PATCHED") return "ok";
    if (verify.summary === "VANILLA") return "bad";
    return "warn";
}

async function refreshStatus() {
    const { ptbInstalled, dist, verify } = await api.getStatus();

    if (!ptbInstalled) {
        $("screen-ptb").hidden = false;
        $("screen-main").hidden = true;
        $("screen-done").hidden = true;
        return;
    }

    $("screen-ptb").hidden = true;
    $("screen-main").hidden = false;

    const dot = $("status-dot");
    dot.className = `dot ${dotClass(verify)}`;
    $("status-headline").textContent = summaryHeadline(verify);
    $("status-detail").textContent = verify.ptbRunning
        ? "Discord PTB is running — quit from tray before Install/Repair for best results."
        : bootstrap.copy.ptbOnlyNote;

    const list = $("app-list");
    list.innerHTML = "";
    for (const row of verify.apps) {
        const li = document.createElement("li");
        li.textContent = `${row.app}: ${row.state} — ${row.detail}`;
        list.appendChild(li);
    }

    const warn = $("dist-warn");
    if (!dist.ready) {
        warn.hidden = false;
        warn.textContent = bootstrap.packaged
            ? "Bundled Quiet build is missing — reinstall the installer or build from source."
            : `Build Quiet first (pnpm build). Missing: ${dist.missing.join(", ")}`;
        $("btn-install").disabled = true;
        $("btn-update").disabled = true;
        $("btn-reinstall-bundle").disabled = true;
    } else {
        warn.hidden = true;
        $("btn-install").disabled = busy;
        $("btn-update").disabled = busy;
        $("btn-reinstall-bundle").disabled = busy || verify.summary === "VANILLA";
    }

    $("btn-uninstall").disabled = busy || verify.summary === "VANILLA";
}

function showDone() {
    $("screen-main").hidden = true;
    $("screen-done").hidden = false;
    $("hub-hint").textContent = bootstrap.copy.hubHint;
}

async function runInstall() {
    setBusy(true);
    showLog([]);
    const result = await api.install();
    setBusy(false);
    showLog(result.logs);
    if (result.ok) {
        showDone();
    } else {
        alert(result.error ?? "Install failed");
        await refreshStatus();
    }
}

async function runReinstallBundle() {
    setBusy(true);
    const result = await api.reinstallBundle();
    setBusy(false);
    showLog(result.logs);
    if (result.ok) {
        alert("Bundle reinstalled. In Discord PTB press Ctrl+R (or restart PTB).");
    } else {
        alert(result.error ?? "Reinstall failed");
    }
    await refreshStatus();
}

async function runUninstall() {
    if (!confirm("Remove QuietCord from Discord PTB and restore vanilla?")) return;
    setBusy(true);
    const result = await api.uninstall();
    setBusy(false);
    showLog(result.logs);
    if (!result.ok) alert(result.error ?? "Uninstall failed");
    await refreshStatus();
}

async function init() {
    bootstrap = await api.getBootstrap();
    $("product-name").textContent = bootstrap.copy.productName;
    $("tagline").textContent = bootstrap.copy.tagline;
    $("ptb-note").textContent = bootstrap.copy.ptbOnlyNote;

    if (bootstrap.logoUrl) {
        const img = $("logo");
        img.src = bootstrap.logoUrl;
        img.hidden = false;
    }

    $("btn-download-ptb").onclick = () => api.openExternal(bootstrap.ptbDownloadUrl);
    $("btn-recheck-ptb").onclick = () => refreshStatus();
    $("btn-install").onclick = () => runInstall();
    $("btn-update").onclick = () => runInstall();
    $("btn-uninstall").onclick = () => runUninstall();
    $("btn-reinstall-bundle").onclick = () => runReinstallBundle();
    $("btn-refresh").onclick = () => refreshStatus();
    $("btn-open-ptb").onclick = async () => {
        const r = await api.launchPtb();
        if (!r.ok) alert(r.error);
    };
    $("btn-cloud").onclick = () => api.openExternal(bootstrap.copy.cloudPrivacyUrl);
    $("btn-back").onclick = () => {
        $("screen-done").hidden = true;
        $("screen-main").hidden = false;
        refreshStatus();
    };
    $("link-website").onclick = () => api.openExternal(bootstrap.copy.websiteUrl);

    await refreshStatus();
}

init().catch(err => {
    alert(err?.message ?? String(err));
});
