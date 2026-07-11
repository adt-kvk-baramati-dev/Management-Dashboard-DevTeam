#!/usr/bin/env python3
"""Generate real Maharashtra district, taluka, and village GeoJSON from the shapefile ZIP.

Usage:
  python3 scripts/generate-real-geojson.py

This script:
- extracts Maharashtra_Taluka.zip into a temporary directory
- reads the shapefile with GeoPandas
- converts it to EPSG:4326
- writes real district, taluka, and village GeoJSON hierarchies
- replaces the placeholder rectangle taluka files
"""

from __future__ import annotations

import ast
import difflib
import json
import re
import shutil
import unicodedata
import zipfile
from pathlib import Path

import geopandas as gpd
from shapely.geometry import mapping

ROOT = Path(__file__).resolve().parent.parent
ZIP_PATH = ROOT / "Maharashtra_Taluka.zip"
TEMP_DIR = ROOT / ".tmp-maharashtra-geojson"
DISTRICT_OUT = ROOT / "public/geojson/districts/maharashtra.json"
TALUKA_OUT_DIR = ROOT / "public/geojson/talukas/maharashtra"
VILLAGE_OUT_DIR = ROOT / "public/geojson/villages/maharashtra"
CANONICAL_TALUKA_SOURCE = ROOT / "scripts/generate-taluka-geojson.mjs"

DISTRICT_ALIASES = {
    "AHILYANAGAR": "Ahilyanagar",
    "AHMEDNAGAR": "Ahilyanagar",
    "AKOLA": "Akola",
    "AMARAWATI": "Amravati",
    "BEED": "Beed",
    "BID": "Beed",
    "BHANDARA": "Bhandara",
    "BULDHANA": "Buldhana",
    "BULDANA": "Buldhana",
    "CHANDRAPUR": "Chandrapur",
    "CHHATRAPATI SAMBHAJINAGAR": "Chhatrapati Sambhajinagar",
    "AURANGABAD": "Chhatrapati Sambhajinagar",
    "DHARASHIV": "Dharashiv",
    "OSMANABAD": "Dharashiv",
    "DHULE": "Dhule",
    "GADCHIROLI": "Gadchiroli",
    "GARHCHIROLI": "Gadchiroli",
    "GONDIA": "Gondia",
    "GONDIYA": "Gondia",
    "HINGOLI": "Hingoli",
    "JALGAON": "Jalgaon",
    "JALNA": "Jalna",
    "KOLHPUR": "Kolhapur",
    "KOLHAPUR": "Kolhapur",
    "LATUR": "Latur",
    "MUMBAI": "Mumbai City",
    "GREATER BOMBAY": "Mumbai City",
    "MUMBAI SUBURBAN": "Mumbai Suburban",
    "NANDED": "Nanded",
    "NDED": "Nanded",
    "NASHIK": "Nashik",
    "NAGPUR": "Nagpur",
    "NANDURBAR": "Nandurbar",
    "NANDURBR": "Nandurbar",
    "PALGHAR": "Palghar",
    "PARBHANI": "Parbhani",
    "PUNE": "Pune",
    "RAIGAD": "Raigad",
    "RAIGARH": "Raigad",
    "RATNAGIRI": "Ratnagiri",
    "SATARA": "Satara",
    "SANGLI": "Sangli",
    "SINDHUDURG": "Sindhudurg",
    "SOLAPUR": "Solapur",
    "THANE": "Thane",
    "WARDHA": "Wardha",
    "WASHIM": "Washim",
    "YAVATMAL": "Yavatmal",
}

DISTRICT_SLUGS = {
    "Ahilyanagar": "ahilyanagar",
    "Akola": "akola",
    "Amravati": "amravati",
    "Beed": "beed",
    "Bhandara": "bhandara",
    "Buldhana": "buldhana",
    "Chandrapur": "chandrapur",
    "Chhatrapati Sambhajinagar": "chhatrapati_sambhajinagar",
    "Dharashiv": "dharashiv",
    "Dhule": "dhule",
    "Gadchiroli": "gadchiroli",
    "Gondia": "gondia",
    "Hingoli": "hingoli",
    "Jalgaon": "jalgaon",
    "Jalna": "jalna",
    "Kolhapur": "kolhapur",
    "Latur": "latur",
    "Mumbai City": "mumbai_city",
    "Mumbai Suburban": "mumbai_suburban",
    "Nanded": "nanded",
    "Nashik": "nashik",
    "Nagpur": "nagpur",
    "Nandurbar": "nandurbar",
    "Palghar": "palghar",
    "Parbhani": "parbhani",
    "Pune": "pune",
    "Raigad": "raigad",
    "Ratnagiri": "ratnagiri",
    "Sangli": "sangli",
    "Satara": "satara",
    "Sindhudurg": "sindhudurg",
    "Solapur": "solapur",
    "Thane": "thane",
    "Wardha": "wardha",
    "Washim": "washim",
    "Yavatmal": "yavatmal",
}


def normalize_key(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace(">", "A")
    text = re.sub(r"[^A-Za-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip().upper()


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace(">", "a")
    text = re.sub(r"[^A-Za-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text.lower()


def parse_canonical_talukas(source_path: Path) -> dict[str, list[str]]:
    text = source_path.read_text(encoding="utf-8")
    match = re.search(r"const DISTRICT_TALUKAS = \{([\s\S]*?)\n\};", text)
    if not match:
        raise RuntimeError("Could not find DISTRICT_TALUKAS in generate-taluka-geojson.mjs")

    taluka_map: dict[str, list[str]] = {}
    for line in match.group(1).splitlines():
        line = line.strip().rstrip(",")
        if not line or line.startswith("//"):
            continue
        key, value = line.split(":", 1)
        district = key.strip().strip('"')
        taluka_map[district] = ast.literal_eval(value.strip())
    return taluka_map


def canonical_district(raw: str) -> str:
    key = normalize_key(raw)
    return DISTRICT_ALIASES.get(key, key.title())


def canonical_taluka_name(district: str, raw_taluka: str, taluka_map: dict[str, list[str]]) -> str:
    candidates = taluka_map.get(district, [])
    if not candidates:
        return str(raw_taluka).strip().title()

    raw_norm = slugify(raw_taluka)
    normalized_candidates = {slugify(candidate): candidate for candidate in candidates}
    if raw_norm in normalized_candidates:
        return normalized_candidates[raw_norm]

    best = difflib.get_close_matches(raw_norm, list(normalized_candidates.keys()), n=1, cutoff=0.72)
    if best:
        return normalized_candidates[best[0]]

    return str(raw_taluka).strip().title()


def district_slug(district_name: str) -> str:
    return DISTRICT_SLUGS.get(district_name, slugify(district_name))


def village_name(raw_village: str) -> str:
    return str(raw_village).strip()


def extract_zip(zip_path: Path, extract_dir: Path) -> Path:
    if extract_dir.exists():
        shutil.rmtree(extract_dir)
    extract_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(extract_dir)
    shp_files = list(extract_dir.glob("*.shp"))
    if not shp_files:
        raise RuntimeError("No .shp file found after extraction")
    return shp_files[0]


def ensure_clean_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def write_feature_collection(path: Path, features: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump({"type": "FeatureCollection", "features": features}, handle, ensure_ascii=False, separators=(",", ":"))


def build_feature(geometry, properties: dict[str, str]) -> dict:
    return {
        "type": "Feature",
        "properties": properties,
        "geometry": mapping(geometry),
    }


def main() -> int:
    if not ZIP_PATH.exists():
        raise FileNotFoundError(f"Missing archive: {ZIP_PATH}")

    taluka_map = parse_canonical_talukas(CANONICAL_TALUKA_SOURCE)
    ensure_clean_dir(TALUKA_OUT_DIR)
    ensure_clean_dir(VILLAGE_OUT_DIR)
    DISTRICT_OUT.parent.mkdir(parents=True, exist_ok=True)

    extract_dir = TEMP_DIR
    shp_path = extract_zip(ZIP_PATH, extract_dir)

    try:
        gdf = gpd.read_file(shp_path)
        if gdf.crs is None:
            raise RuntimeError("Shapefile CRS is missing")
        gdf = gdf.to_crs(epsg=4326)
        gdf = gdf[gdf.geometry.notna()].copy()

        gdf["district_name"] = gdf["District"].map(canonical_district)
        gdf["taluka_name"] = gdf.apply(
            lambda row: canonical_taluka_name(str(row["District"]), str(row["Sub_dist"]), taluka_map),
            axis=1,
        )
        gdf["village_name"] = gdf["Vill_name"].map(village_name)

        district_features: list[dict] = []
        for district_name, district_group in gdf.groupby("district_name", sort=True):
            district_geometry = district_group.geometry.union_all()
            district_features.append(
                build_feature(
                    district_geometry,
                    {
                        "NAME_2": district_name,
                        "district": district_name,
                    },
                )
            )
        write_feature_collection(DISTRICT_OUT, district_features)

        taluka_file_count = 0
        village_file_count = 0
        for district_name, district_group in gdf.groupby("district_name", sort=True):
            district_slug_name = district_slug(district_name)
            taluka_features: list[dict] = []
            village_dir = VILLAGE_OUT_DIR / district_slug_name
            ensure_clean_dir(village_dir)

            for taluka_name, taluka_group in district_group.groupby("taluka_name", sort=True):
                taluka_geometry = taluka_group.geometry.union_all()
                taluka_features.append(
                    build_feature(
                        taluka_geometry,
                        {
                            "taluka": taluka_name,
                            "district": district_name,
                        },
                    )
                )

                village_features: list[dict] = []
                for _, row in taluka_group.sort_values("village_name").iterrows():
                    village_features.append(
                        build_feature(
                            row.geometry,
                            {
                                "village": row["village_name"],
                                "taluka": taluka_name,
                                "district": district_name,
                            },
                        )
                    )

                write_feature_collection(village_dir / f"{slugify(taluka_name)}.json", village_features)
                village_file_count += 1

            write_feature_collection(TALUKA_OUT_DIR / f"{district_slug_name}.json", taluka_features)
            taluka_file_count += 1

        print(json.dumps({
            "districts": len(district_features),
            "taluka_files": taluka_file_count,
            "village_files": village_file_count,
            "district_output": str(DISTRICT_OUT),
            "taluka_output_dir": str(TALUKA_OUT_DIR),
            "village_output_dir": str(VILLAGE_OUT_DIR),
        }, indent=2))
        return 0
    finally:
        shutil.rmtree(extract_dir, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
