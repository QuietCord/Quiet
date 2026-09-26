#!/usr/bin/env node
/**
 * Classify Quiet plugins for Stage 5 load manifest (report-only).
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { readdirSync, statSync } from "fs";

const ROOT = join(import.meta.dirname, "..");
const PLUGINS = join(ROOT, "src", "plugins");

function hasPatches(src: string) {
    return /\bpatches\s*:\s*\[/.test(src) || /\bpatches\s*:\s*\{/.test(src);
}

function classify(name: string, src: string) {
    if (name.startsWith("_")) return "CORE";
    if (hasPatches(src)) return "PATCH_CRITICAL";
    if (/OptionType\.COMPONENT|settingsAboutComponent/.test(src)) return "LAZY_SAFE";
    if (/\.dev\./.test(name)) return "DEV_ONLY";
    if (/flux\s*:/.test(src) || /start\s*\(/.test(src)) return "RUNTIME";
    return "LAZY_SAFE";
}

const rows: Array<{ name: string; tier: string; path: string; }> = [];

for (const ent of readdirSync(PLUGINS, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith(".")) continue;
    const indexTs = join(PLUGINS, ent.name, "index.ts");
    const indexTsx = join(PLUGINS, ent.name, "index.tsx");
    const file = [indexTs, indexTsx].find(p => {
        try { statSync(p); return true; } catch { return false; }
    });
    if (!file) continue;
    const src = readFileSync(file, "utf8");
    rows.push({ name: ent.name, tier: classify(ent.name, src), path: file.replace(/\\/g, "/") });
}

rows.sort((a, b) => a.tier.localeCompare(b.tier) || a.name.localeCompare(b.name));

const out = {
    generatedAt: new Date().toISOString(),
    note: "Report-only — esbuild still imports ~plugins statically. Stage 5 item 13+.",
    tiers: ["CORE", "PATCH_CRITICAL", "RUNTIME", "LAZY_SAFE", "DEV_ONLY"],
    plugins: rows,
};

const dest = join(ROOT, "dist", "quiet-plugin-load-manifest.json");
writeFileSync(dest, JSON.stringify(out, null, 2));
console.log("Wrote", dest, `(${rows.length} plugins)`);
