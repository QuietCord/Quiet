#!/usr/bin/env node
/** Restore Discord PTB to vanilla (undo Quiet embed) for every app-* folder. */
import { runRestoreVanilla } from "./ptbInstallApi.mjs";

await runRestoreVanilla();
console.log("\nDiscord PTB should open normally now.");
