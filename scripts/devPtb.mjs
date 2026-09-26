#!/usr/bin/env node
/**
 * Dev loop: esbuild watch + sync to PTB on each build.
 * Usage: bunx pnpm@11.9.0 dev:ptb
 */
import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const bunBin = join(process.env.USERPROFILE ?? "", ".bun", "bin", isWin ? "bun.exe" : "bun");

function run(cmd, args, label) {
    const child = spawn(cmd, args, {
        cwd: root,
        stdio: "inherit",
        shell: false,
        env: { ...process.env, QUIET_DEV: "1", QUIET_REPO_PATH: root.replace(/\\/g, "/") },
    });
    child.on("exit", code => {
        if (code !== 0 && code != null) console.error(`[Quiet] ${label} exited`, code);
    });
    return child;
}

const watch = run(bunBin, ["x", "pnpm@11.9.0", "watch"], "watch");
const syncWatcher = run(process.execPath, [join(root, "scripts", "watchSyncPtb.mjs")], "watchSyncPtb");

function shutdown() {
    watch.kill();
    syncWatcher.kill();
    process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("[Quiet] dev:ptb — edit src/, PTB picks up via sync (Ctrl+R renderer / restart for patcher)");
