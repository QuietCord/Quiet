#!/usr/bin/env node
/**
 * Discord Developer Portal assets from logo.png
 * - discord-rich-presence.png → Art Assets key "quiet" (512×512 min; also writes 1024×1024)
 * - discord-rp-cover.png → Cover / invite image (1024×576)
 */
import sharp from "sharp";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const brand = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "brand");
const src = join(brand, "logo.png");
const BG = { r: 35, g: 36, b: 40, alpha: 255 };

async function composeSquare(size, pad, outPath) {
    const trimmed = await sharp(src).trim({ threshold: 1 }).png().toBuffer();
    const { width: tw, height: th } = await sharp(trimmed).metadata();

    const maxSide = size - pad * 2;
    const scale = Math.max(1, Math.min(Math.floor(maxSide / tw), Math.floor(maxSide / th)));
    const nw = tw * scale;
    const nh = th * scale;

    const sprite = await sharp(trimmed)
        .resize(nw, nh, { kernel: sharp.kernel.nearest, fit: "fill" })
        .png()
        .toBuffer();

    await sharp({
        create: { width: size, height: size, channels: 4, background: BG },
    })
        .composite([{ input: sprite, left: Math.round((size - nw) / 2), top: Math.round((size - nh) / 2) }])
        .png({ compressionLevel: 9 })
        .toFile(outPath);

    console.log(`Wrote ${outPath} (${size}x${size}), sprite ${nw}x${nh} @ ${scale}x`);
}

async function composeCover(w, h, pad, outPath) {
    const trimmed = await sharp(src).trim({ threshold: 1 }).png().toBuffer();
    const { width: tw, height: th } = await sharp(trimmed).metadata();

    const maxW = w - pad * 2;
    const maxH = h - pad * 2;
    const scale = Math.max(1, Math.min(Math.floor(maxW / tw), Math.floor(maxH / th)));
    const nw = tw * scale;
    const nh = th * scale;

    const sprite = await sharp(trimmed)
        .resize(nw, nh, { kernel: sharp.kernel.nearest, fit: "fill" })
        .png()
        .toBuffer();

    await sharp({
        create: { width: w, height: h, channels: 4, background: BG },
    })
        .composite([{ input: sprite, left: Math.round((w - nw) / 2), top: Math.round((h - nh) / 2) }])
        .png({ compressionLevel: 9 })
        .toFile(outPath);

    console.log(`Wrote ${outPath} (${w}x${h}), sprite ${nw}x${nh} @ ${scale}x`);
}

await composeSquare(512, 24, join(brand, "discord-rich-presence.png"));
await composeSquare(1024, 48, join(brand, "discord-rich-presence-1024.png"));
await composeCover(1024, 576, 40, join(brand, "discord-rp-cover.png"));
