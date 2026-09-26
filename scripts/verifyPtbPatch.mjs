#!/usr/bin/env node
/** Check that Discord PTB has Quiet embedded in every app-* folder. */
import { logPtbOnlyScope, PTB_ROOT } from "./discordPtb.mjs";
import { verifyPtbInstall } from "./ptbInstallApi.mjs";

logPtbOnlyScope();

const result = verifyPtbInstall();
for (const row of result.apps) {
    const label = row.state === "patched" ? "PATCHED" : row.state.toUpperCase();
    console.log(`${row.app}: ${label} (${row.detail})`);
}

console.log("\nPTB root:", PTB_ROOT);
console.log("Summary:", result.summary);

process.exit(result.ok ? 0 : 1);
