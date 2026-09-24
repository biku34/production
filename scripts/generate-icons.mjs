// One-off icon generator: rasterizes scripts/icon-source.svg into the PNG sizes
// a PWA needs. Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "scripts", "icon-source.svg"));
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "maskable-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-32.png", size: 32 },
];

for (const t of targets) {
  await sharp(svg, { density: 384 })
    .resize(t.size, t.size)
    .flatten({ background: "#0a6647" }) // no transparency (iOS-friendly)
    .png()
    .toFile(join(outDir, t.name));
  console.log("wrote", t.name);
}
console.log("Icons generated in public/icons/");
