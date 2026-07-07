#!/usr/bin/env node
/**
 * Regenerate PWA icons from public/logo.png (yellow Frido wordmark).
 * Run: node scripts/generate-icons.mjs
 */
import sharp from "sharp";

const src = "public/logo.png";
const targets = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["public/apple-touch-icon.png", 180],
];

for (const [out, size] of targets) {
  await sharp(src)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toFile(out);
  console.log(`✓ ${out} (${size}x${size})`);
}
