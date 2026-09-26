#!/usr/bin/env node
/**
 * Pixel contributor badge: Quiet cat (logo) + wrench, Discord dev-badge vibe.
 * Output: assets/brand/contributor-badge.png (64×64)
 */
import sharp from "sharp";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const brand = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "brand");
const src = join(brand, "logo.png");
const out = join(brand, "contributor-badge.png");
const SIZE = 64;
const BG = { r: 35, g: 36, b: 40, alpha: 255 };
const WRENCH = { r: 240, g: 178, b: 50, alpha: 255 };
const WRENCH_HI = { r: 255, g: 220, b: 120, alpha: 255 };

/** 18×18 pixel wrench (1 = metal, 2 = highlight) */
const WRENCH_GRID = [
    "................",
    "......2222......",
    ".....211112.....",
    "....211..211....",
    "....21....21....",
    "....21....21....",
    ".....211112.....",
    "......2111......",
    ".....211........",
    "....211.........",
    "...211..........",
    "..211...........",
    ".211............",
    ".21.............",
    "..2.............",
    "................",
    "................",
    "................",
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
const catMax = 30;
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
const catTop = Math.round((SIZE - nh) / 2);
const wrenchLeft = 34;
const wrenchTop = Math.round((SIZE - wrenchMeta.height) / 2);

if (catLeft + nw > SIZE || catTop + nh > SIZE) {
    throw new Error(`Cat sprite ${nw}x${nh} at ${catLeft},${catTop} exceeds ${SIZE}px canvas`);
}
if (wrenchLeft + wrenchMeta.width > SIZE || wrenchTop + wrenchMeta.height > SIZE) {
    throw new Error(`Wrench exceeds canvas`);
}

await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: BG },
})
    .composite([
        { input: cat, left: catLeft, top: catTop },
        { input: wrench, left: wrenchLeft, top: wrenchTop },
    ])
    .png({ compressionLevel: 9 })
    .toFile(out);

console.log(`Wrote ${out}`);
