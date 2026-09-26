#!/usr/bin/env node
/** Transparent background + tight crop for assets/brand/logo.png */
import { execFileSync } from "child_process";
import sharp from "sharp";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const brand = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "brand");
const src = join(brand, "logo.png");

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.from(data);
const w = info.width;
const h = info.height;
const ch = info.channels;

function isBgPixel(r, g, b) {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 235) return true;
    if (lum < 8) return true;
    if (r > 180 && g > 180 && b > 180 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15) return true;
    return false;
}

const bg = new Uint8Array(w * h);
const queue = [];

function tryBg(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (bg[i]) return;
    const o = i * ch;
    if (!isBgPixel(out[o], out[o + 1], out[o + 2])) return;
    bg[i] = 1;
    queue.push(i);
}

for (let x = 0; x < w; x++) {
    tryBg(x, 0);
    tryBg(x, h - 1);
}
for (let y = 0; y < h; y++) {
    tryBg(0, y);
    tryBg(w - 1, y);
}

while (queue.length) {
    const i = queue.pop();
    const x = i % w;
    const y = (i / w) | 0;
    tryBg(x - 1, y);
    tryBg(x + 1, y);
    tryBg(x, y - 1);
    tryBg(x, y + 1);
}

for (let i = 0; i < w * h; i++) {
    if (bg[i]) out[i * ch + 3] = 0;
}

let minX = w;
let minY = h;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
        if (out[(y * w + x) * ch + 3] > 0) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    }
}

const pad = 2;
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(w - 1, maxX + pad);
maxY = Math.min(h - 1, maxY + pad);
const cw = maxX - minX + 1;
const ch2 = maxY - minY + 1;

const cropped = Buffer.alloc(cw * ch2 * ch);
for (let y = 0; y < ch2; y++) {
    for (let x = 0; x < cw; x++) {
        const si = ((minY + y) * w + (minX + x)) * ch;
        const di = (y * cw + x) * ch;
        cropped[di] = out[si];
        cropped[di + 1] = out[si + 1];
        cropped[di + 2] = out[si + 2];
        cropped[di + 3] = out[si + 3];
    }
}

const png = await sharp(cropped, { raw: { width: cw, height: ch2, channels: 4 } })
    .resize(128, 128, { kernel: sharp.kernel.nearest, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

writeFileSync(join(brand, "logo.png"), png);

execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "generateDiscordRpAsset.mjs")], {
    stdio: "inherit",
});

execFileSync("npx", ["--yes", "png-to-ico", join(brand, "logo.png"), "--output", join(brand, "favicon.ico")], {
    shell: true,
    stdio: "inherit"
});
console.log(`Processed logo: crop ${cw}x${ch2} -> 128px (${png.length} bytes); Discord RP assets regenerated`);
