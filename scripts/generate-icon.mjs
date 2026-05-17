import sharp from "sharp";
import { resolve } from "path";

const SIZE = 512;

const svg = `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lc-g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#16a34a"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="28" fill="url(#lc-g)"/>
  <rect x="-23" y="-10" width="46" height="20" rx="10"
    fill="none" stroke="white" stroke-width="9"
    transform="translate(63 37) rotate(-45)"/>
  <rect x="-23" y="-10" width="46" height="20" rx="10"
    fill="none" stroke="white" stroke-width="9"
    transform="translate(37 63) rotate(-45)"/>
</svg>`;

const outPath = resolve("public/linkcash-icon-512.png");

await sharp(Buffer.from(svg))
  .resize(SIZE, SIZE)
  .png()
  .toFile(outPath);

console.log(`Saved ${SIZE}x${SIZE} PNG → ${outPath}`);
