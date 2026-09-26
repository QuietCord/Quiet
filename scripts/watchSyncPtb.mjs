#!/usr/bin/env node
/**
 * Watch dist/ and sync to Discord PTB _vencord after each rebuild.
 * Run alongside `pnpm watch` (see dev:ptb).
 */
import { execFileSync } from "child_process";
import { watch } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const files = ["renderer.js", "renderer.css", "patcher.js", "preload.js"];

let debounce = null;

function sync() {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
        try {
            execFileSync(process.execPath, [join(root, "scripts", "syncEmbeddedPtb.mjs")], {
                stdio: "inherit",
                cwd: root,
            });
        } catch {
            console.warn("[Quiet] sync:ptb failed — run pnpm inject:ptb once");
        }
    }, 400);
}

for (const f of files) {
    watch(join(dist, f), { persistent: true }, () => sync());
}

console.log("[Quiet] Watching dist/ → auto sync:ptb (Ctrl+C to stop)");
sync();
