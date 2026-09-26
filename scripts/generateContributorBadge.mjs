#!/usr/bin/env node
/**
 * Pixel contributor badge: Quiet cat + wrench (Discord dev-badge layout).
 * Output: assets/brand/contributor-badge.png (48×48, transparent)
 */
import sharp from "sharp";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const brand = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "brand");
const src = join(brand, "logo.png");
const out = join(brand, "contributor-badge.png");
const SIZE = 48;
const WRENCH = { r: 240, g: 178, b: 50, alpha: 255 };
const WRENCH_HI = { r: 255, g: 220, b: 120, alpha: 255 };

/** 20×20 pixel wrench (1 = metal, 2 = highlight) */
const WRENCH_GRID = [
    "....................",
    ".......2222.........",
    "......211112........",
    "...211211..211......",
    "...21..21....21.....",
    "...21..21....21.....",
    "......211112........",
    ".......2111.........",
    "......211...........",
    ".....211............",
    "....211.............",
    "...211..............",
    "..211...............",
    ".211................",
    ".21.................",
    "..2.................",
    "....................",
    "....................",
    "....................",
    "....................",
];

function wrenchBuffer() {
    const w = WRENCH_GRID[0].length;
    const h = WRENCH_GRID.length;
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const c = WRENCH_GRID[y][x];
            const i = (y * w + x) * 4;
            if (c === "1") {
                buf[i] = WRENCH.r;
                buf[i + 1] = WRENCH.g;
                buf[i + 2] = WRENCH.b;
                buf[i + 3] = 255;
            } else if (c === "2") {
                buf[i] = WRENCH_HI.r;
                buf[i + 1] = WRENCH_HI.g;
                buf[i + 2] = WRENCH_HI.b;
                buf[i + 3] = 255;
            }
        }
    }
    return sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

const trimmed = await sharp(src).trim({ threshold: 1 }).png().toBuffer();
const { width: tw, height: th } = await sharp(trimmed).metadata();
const catMax = 34;
const scale = Math.min(catMax / tw, catMax / th);
const nw = Math.max(1, Math.round(tw * scale));
const nh = Math.max(1, Math.round(th * scale));
const cat = await sharp(trimmed)
    .resize(nw, nh, { kernel: sharp.kernel.nearest, fit: "fill" })
    .png()
    .toBuffer();

const wrench = await wrenchBuffer();
const wrenchMeta = await sharp(wrench).metadata();

const catLeft = 2;
const catTop = Math.round((SIZE - nh) / 2) + 1;
const wrenchLeft = SIZE - wrenchMeta.width - 1;
const wrenchTop = SIZE - wrenchMeta.height - 1;

await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
    .composite([
        { input: cat, left: catLeft, top: catTop },
        { input: wrench, left: wrenchLeft, top: wrenchTop },
    ])
    .png({ compressionLevel: 9 })
    .toFile(out);

console.log(`Wrote ${out}`);
