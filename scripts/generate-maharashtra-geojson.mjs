#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IN_FILE = path.join(__dirname, "../public/geojson/india.json");
const OUT_DIR = path.join(__dirname, "../public/geojson/districts");
const OUT_FILE = path.join(OUT_DIR, "maharashtra.json");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

try {
  const src = readJson(IN_FILE);

  if (!Array.isArray(src.features) || src.features.length === 0) {
    console.error(`No features found in ${IN_FILE}`);
    process.exit(2);
  }

  // Detect whether the source contains district-level features (NAME_2)
  const hasName2 = src.features.some(f => f.properties && Object.prototype.hasOwnProperty.call(f.properties, 'NAME_2'));

  if (!hasName2) {
    console.log(`${IN_FILE} does not contain district-level features (no NAME_2).`);
    console.log(`Nothing to extract. If you have a district-level GeoJSON, place it in ${OUT_DIR} or run a different generator.`);
    process.exit(0);
  }

  // Filter features belonging to Maharashtra
  const maharashtra = {
    type: "FeatureCollection",
    features: src.features.filter(f => {
      const props = f.properties || {};
      const name1 = String(props.NAME_1 || props.STATE || "").trim().toLowerCase();
      return name1 === "maharashtra";
    })
  };

  if (maharashtra.features.length === 0) {
    console.log("No Maharashtra features found in the source file.");
    process.exit(0);
  }

  writeJson(OUT_FILE, maharashtra);
  console.log(`Wrote ${maharashtra.features.length} features to ${OUT_FILE}`);
} catch (err) {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
}
