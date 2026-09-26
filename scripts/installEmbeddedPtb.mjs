#!/usr/bin/env node
/**
 * Embed Quiet into Discord PTB (Windows): copies dist/ to resources/_vencord
 * and builds a valid app.asar stub via @electron/asar.
 */
import { runEmbeddedInstall } from "./ptbInstallApi.mjs";

await runEmbeddedInstall();
console.log("\nDone. Fully quit Discord PTB (tray), then reopen. If it fails to start: pnpm restore:ptb");
