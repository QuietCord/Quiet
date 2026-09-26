#!/usr/bin/env node
/**
 * Copy dist/ into Discord PTB resources/_vencord only (no app.asar).
 */
import { isWindowsProcessRunning, logPtbOnlyScope, PTB_EXE, quitDiscordPtb } from "./discordPtb.mjs";
import { runReinstallBundle } from "./ptbInstallApi.mjs";

logPtbOnlyScope();
if (process.env.QUIET_QUIT_PTB === "1") {
    quitDiscordPtb();
} else if (process.platform === "win32" && isWindowsProcessRunning(PTB_EXE)) {
    console.log("[Quiet] PTB left running — press Ctrl+R in Discord to load renderer changes.");
}

try {
    const { syncedFolders } = runReinstallBundle({ quitFirst: false });
    console.log(`\nSynced ${syncedFolders} folder(s).`);
} catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
}
