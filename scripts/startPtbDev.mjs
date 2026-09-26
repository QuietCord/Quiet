#!/usr/bin/env node
/** Launch Discord PTB (Quiet inject must already be applied). Sets QUIET_DEV for the child process. */
import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const ptbRoot = join(process.env.LOCALAPPDATA ?? "", "DiscordPTB");
const updateExe = join(ptbRoot, "Update.exe");

if (!existsSync(updateExe)) {
    console.error("Discord PTB not found:", updateExe);
    process.exit(1);
}

const env = { ...process.env, QUIET_DEV: "1" };
if (!env.QUIET_REPO_PATH && existsSync("C:\\Projects\\Quiet\\.git")) {
    env.QUIET_REPO_PATH = "C:\\Projects\\Quiet";
}

console.log("[Quiet] Starting Discord PTB with QUIET_DEV=1");
const child = spawn(updateExe, ["--processStart", "DiscordPTB.exe"], {
    env,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
});
child.unref();
