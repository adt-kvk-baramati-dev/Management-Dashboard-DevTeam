import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(currentDir, "..", "public");

mkdirSync(publicDir, { recursive: true });

const colorStops = [
  ["#d8f5e4", "#76c893", "#2c7a7b"],
  ["#f5f1d7", "#f2b950", "#e07a5f"],
  ["#eaf4ff", "#7fb3d5", "#2a6f97"],
];

const makeSvg = (index) => {
  const [a, b, c] = colorStops[(index - 1) % colorStops.length];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="384" viewBox="0 0 1600 384" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${a}" />
      <stop offset="55%" stop-color="${b}" />
      <stop offset="100%" stop-color="${c}" />
    </linearGradient>
  </defs>
  <rect width="1600" height="384" fill="url(#grad${index})" />
  <path d="M0,280 C320,220 680,310 1020,250 C1260,210 1450,290 1600,250 L1600,384 L0,384 Z" fill="white" fill-opacity="0.28" />
  <circle cx="420" cy="120" r="36" fill="white" fill-opacity="0.5" />
  <circle cx="820" cy="180" r="46" fill="white" fill-opacity="0.22" />
  <path d="M200 320 Q400 200 600 320 T1000 320" stroke="white" stroke-width="7" fill="none" opacity="0.2" />
  <text x="45%" y="66%" font-family="Inter, sans-serif" font-size="24" fill="white" fill-opacity="0.86" text-anchor="middle">Automated scenic panel ${index}</text>
</svg>`;
};

for (let i = 1; i <= 3; i += 1) {
  const file = resolve(publicDir, `footer-img-generated-${i}.svg`);
  writeFileSync(file, makeSvg(i), "utf8");
  console.log(`Wrote ${file}`);
}

console.log("Generated 3 footer scenes in public/");
