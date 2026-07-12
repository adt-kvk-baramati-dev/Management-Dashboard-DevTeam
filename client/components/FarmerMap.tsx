import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoBounds } from "d3-geo";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewLevel = "district" | "taluka" | "village";

type FarmerMapProps = { token: string };

type TooltipState = {
  name: string;
  count: number;
} | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const GEOJSON_BASE = import.meta.env.VITE_GEOJSON_BASE;

const DISTRICT_GEO_URL = `${GEOJSON_BASE}/districts/maharashtra.json`;
const TALUKA_GEO_BASE = `${GEOJSON_BASE}/talukas/maharashtra`;
const VILLAGE_GEO_BASE = `${GEOJSON_BASE}/villages/maharashtra`;
const DISTRICT_PROJECTION: Record<string, { center: [number, number]; scale: number }> = {
  "Ahmednagar":                { center: [74.587, 19.160], scale: 14000 },
  "Akola":                     { center: [77.140, 20.764], scale: 22000 },
  "Amravati":                  { center: [77.536, 21.156], scale: 16000 },
  "Aurangabad":                { center: [75.246, 20.026], scale: 18000 },
  "Bhandara":                  { center: [80.059, 21.121], scale: 20000 },
  "Bid":                       { center: [75.776, 18.975], scale: 16000 },
  "Buldana":                   { center: [76.374, 20.565], scale: 20000 },
  "Chandrapur":                { center: [79.393, 20.095], scale: 19000 },
  "Dhule":                     { center: [74.532, 21.134], scale: 20000 },
  "Garhchiroli":               { center: [80.315, 19.753], scale: 14000 },
  "Gondiya":                   { center: [80.174, 21.143], scale: 24000 },
  "Greater Bombay":            { center: [72.950, 19.103], scale: 50000 },
  "Hingoli":                   { center: [77.083, 19.542], scale: 24000 },
  "Jalgaon":                   { center: [75.581, 20.844], scale: 17000 },
  "Jalna":                     { center: [76.062, 19.963], scale: 20000 },
  "Kolhapur":                  { center: [74.202, 16.459], scale: 19000 },
  "Latur":                     { center: [76.749, 18.352], scale: 22000 },
  "Nagpur":                    { center: [78.951, 21.152], scale: 18000 },
  "Nanded":                    { center: [77.650, 19.095], scale: 16000 },
  "Nandurbar":                 { center: [74.182, 21.512], scale: 20000 },
  "Nashik":                    { center: [74.100, 20.226], scale: 17000 },
  "Osmanabad":                 { center: [76.038, 18.169], scale: 20000 },
  "Parbhani":                  { center: [76.664, 19.308], scale: 22000 },
  "Pune":                      { center: [74.250, 18.643], scale: 15000 },
  "Raigarh":                   { center: [73.244, 18.492], scale: 22000 },
  "Ratnagiri":                 { center: [73.452, 17.280], scale: 20000 },
  "Sangli":                    { center: [74.692, 17.171], scale: 16000 },
  "Satara":                    { center: [74.227, 17.636], scale: 19000 },
  "Sindhudurg":                { center: [73.764, 16.133], scale: 22000 },
  "Solapur":                   { center: [75.521, 17.833], scale: 16000 },
  "Thane":                     { center: [73.228, 19.645], scale: 20000 },
  "Wardha":                    { center: [78.635, 20.825], scale: 21000 },
  "Washim":                    { center: [77.147, 20.304], scale: 22000 },
  "Yavatmal":                  { center: [78.214, 20.064], scale: 16000 },
  "Ahilyanagar":               { center: [74.587, 19.160], scale: 14000 },
  "Chhatrapati Sambhajinagar": { center: [75.246, 20.026], scale: 18000 },
  "Dharashiv":                 { center: [76.038, 18.169], scale: 20000 },
  "Beed":                      { center: [75.776, 18.975], scale: 16000 },
  "Gadchiroli":                { center: [80.315, 19.753], scale: 14000 },
  "Gondia":                    { center: [80.174, 21.143], scale: 24000 },
  "Raigad":                    { center: [73.244, 18.492], scale: 22000 },
  "Palghar":                   { center: [72.90 , 19.70 ], scale: 18000 },
  "Mumbai Suburban":           { center: [72.88 , 19.15 ], scale: 70000 },
};

const FOOTER_SCENES = ["/footer-img.png"];

const getFooterScene = (level: ViewLevel) => {
  if (level === "taluka") return FOOTER_SCENES[1] ?? FOOTER_SCENES[0];
  return FOOTER_SCENES[0];
};

const DISTRICT_DISPLAY: Record<string, string> = {
  "Greater Bombay": "Mumbai City",
  "Raigarh":        "Raigad",
  "Bid":            "Beed",
  "Buldana":        "Buldhana",
  "Garhchiroli":    "Gadchiroli",
  "Gondiya":        "Gondia",
  "Osmanabad":      "Dharashiv",
  "Aurangabad":     "Chhatrapati Sambhajinagar",
};

function lerpColor(hexA: string, hexB: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(hexA);
  const [br, bg, bb] = parse(hexB);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const HEATMAP_STOPS: [number, string][] = [
  [0,    "#6dbf45"],
  [1,    "#5aa739"],
  [20,   "#468d2b"],
  [50,   "#33741d"],
  [100,  "#245c13"],
  [200,  "#17450a"],
  [400,  "#0e3105"],
  [700,  "#061f02"],
  [1000, "#011000"],
];

const HOVER_DARKEN = 0.25;

function fillColor(count: number, hovered: boolean): string {
  let lo = HEATMAP_STOPS[0];
  let hi = HEATMAP_STOPS[HEATMAP_STOPS.length - 1];

  for (let i = 0; i < HEATMAP_STOPS.length - 1; i++) {
    if (count >= HEATMAP_STOPS[i][0] && count < HEATMAP_STOPS[i + 1][0]) {
      lo = HEATMAP_STOPS[i];
      hi = HEATMAP_STOPS[i + 1];
      break;
    }
  }

  const logLo  = Math.log1p(lo[0]);
  const logHi  = Math.log1p(hi[0]);
  const logVal = Math.log1p(count);
  const t = logHi > logLo ? Math.min((logVal - logLo) / (logHi - logLo), 1) : 1;

  let colour = lerpColor(lo[1], hi[1], t);
  if (hovered) {
    colour = lerpColor(colour, "#000000", HOVER_DARKEN);
  }
  return colour;
}

function norm(s?: string | null) {
  return (s ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugifyPath(s?: string | null) {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function canonicalDistrictName(raw?: string | null) {
  const value = (raw ?? "").trim();
  const aliases: Record<string, string> = {
    ahmednagar: "Ahilyanagar",
    ahilyanagar: "Ahilyanagar",
    aurangabad: "Chhatrapati Sambhajinagar",
    beed: "Beed",
    bid: "Beed",
    buldana: "Buldhana",
    buldhana: "Buldhana",
    garhchiroli: "Gadchiroli",
    gadchiroli: "Gadchiroli",
    gondiya: "Gondia",
    gondia: "Gondia",
    greaterbombay: "Mumbai City",
    mumbai: "Mumbai City",
    mumbaisuburban: "Mumbai Suburban",
    osmanabad: "Dharashiv",
    raigarh: "Raigad",
    raigad: "Raigad",
  };

  const key = norm(value);
  return aliases[key] ?? value;
}

function locationKey(...parts: Array<string | null | undefined>) {
  return parts.map((part) => norm(part)).join("|");
}

export default function FarmerMap({ token }: FarmerMapProps) {
  const [districtCounts, setDistrictCounts] = useState<Record<string, number>>({});
  const [talukaCounts,   setTalukaCounts]   = useState<Record<string, number>>({});
  const [villageCounts,  setVillageCounts]  = useState<Record<string, number>>({});
  const [totalFarmers,   setTotalFarmers]   = useState(0);
  const [loadingData,    setLoadingData]    = useState(true);

  const [level,           setLevel]           = useState<ViewLevel>("district");
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedTaluka,   setSelectedTaluka]   = useState<string | null>(null);
  const [talukaGeo,        setTalukaGeo]        = useState<any>(null);
  const [villageGeo,       setVillageGeo]       = useState<any>(null);
  const [loadingGeo,       setLoadingGeo]       = useState(false);
  const [loadingVillage,   setLoadingVillage]   = useState(false);
  const [tooltip,         setTooltip]         = useState<TooltipState>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // ── Load farmer counts from API ──────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const ctrl = new AbortController();

    (async () => {
      setLoadingData(true);
      try {
        const res = await fetch("/api/admin/farmer-locations", {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        const rows: { district?: string; taluka?: string; village?: string; count?: number }[] =
          json.farmers ?? json.locations ?? [];

        const dc: Record<string, number> = {};
        const tc: Record<string, number> = {};
        const vc: Record<string, number> = {};
        let total = 0;

        for (const row of rows) {
          const parsedCount = Number(row.count);
          const cnt = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 1;
          total += cnt;
          if (row.district) {
            const district = canonicalDistrictName(row.district);
            const k = norm(district);
            dc[k] = (dc[k] ?? 0) + cnt;
          }
          if (row.taluka) {
            const district = canonicalDistrictName(row.district);
            const k = locationKey(district, row.taluka);
            tc[k] = (tc[k] ?? 0) + cnt;
          }
          if (row.village) {
            const district = canonicalDistrictName(row.district);
            const k = locationKey(district, row.taluka, row.village);
            vc[k] = (vc[k] ?? 0) + cnt;
          }
        }

        setDistrictCounts(dc);
        setTalukaCounts(tc);
        setVillageCounts(vc);
        setTotalFarmers(total);
      } catch {
        // silently ignore aborts
      } finally {
        setLoadingData(false);
      }
    })();

    return () => ctrl.abort();
  }, [token]);

  // ── Load taluka GeoJSON when a district is selected ──────────────────────
  useEffect(() => {
    if (!selectedDistrict) return;

    const slug = slugifyPath(selectedDistrict);
    if (!slug) return;

    const ctrl = new AbortController();
    setLoadingGeo(true);
    let active = true;

    fetch(`${TALUKA_GEO_BASE}/${slug}.json`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((geo) => {
        if (active) setTalukaGeo(geo);
      })
      .catch((err) => {
        console.error("Taluka load failed:", err);
        if (active) setTalukaGeo(null);
      })
      .finally(() => {
        if (active) setLoadingGeo(false);
      });

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [selectedDistrict]);

  // ── Load village GeoJSON when a taluka is selected ──────────────────────
  useEffect(() => {
    if (!selectedDistrict || !selectedTaluka) return;

    const districtSlug = slugifyPath(selectedDistrict);
    const talukaSlug = slugifyPath(selectedTaluka);
    if (!districtSlug || !talukaSlug) return;

    const ctrl = new AbortController();
    setLoadingVillage(true);
    setVillageGeo(null);
    let active = true;

    fetch(`${VILLAGE_GEO_BASE}/${districtSlug}/${talukaSlug}.json`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((geo) => {
        if (active) setVillageGeo(geo);
      })
      .catch((err) => {
        console.error("Village load failed:", err);
        if (active) setVillageGeo(null);
      })
      .finally(() => {
        if (active) setLoadingVillage(false);
      });

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [selectedDistrict, selectedTaluka]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getDistrictCount = useCallback(
    (geoName: string) => {
      const district = canonicalDistrictName(geoName);
      return districtCounts[norm(district)] ?? 0;
    },
    [districtCounts],
  );

  const getTalukaCount = useCallback(
    (talukaName: string) => {
      if (!selectedDistrict) return 0;
      const district = canonicalDistrictName(selectedDistrict);
      return talukaCounts[locationKey(district, talukaName)] ?? 0;
    },
    [selectedDistrict, talukaCounts],
  );

  const getVillageCount = useCallback(
    (villageName: string) => {
      if (!selectedDistrict || !selectedTaluka) return 0;
      const district = canonicalDistrictName(selectedDistrict);
      return villageCounts[locationKey(district, selectedTaluka, villageName)] ?? 0;
    },
    [selectedDistrict, selectedTaluka, villageCounts],
  );

  const selectedDisplayName = selectedDistrict
    ? (DISTRICT_DISPLAY[selectedDistrict] ?? selectedDistrict)
    : null;

  const panelTitle = level === "village" && selectedTaluka
    ? selectedTaluka
    : selectedDisplayName ?? "All Maharashtra";

  // ── Mouse handlers ───────────────────────────────────────────────────────

  const handleDistrictMouseEnter = useCallback(
    (geoName: string) => {
      const name = canonicalDistrictName(geoName);
      const count = getDistrictCount(geoName);
      setTooltip((prev) =>
        prev && prev.name === name && prev.count === count ? prev : { name, count },
      );
    },
    [getDistrictCount],
  );

  const handleTalukaMouseEnter = useCallback(
    (talukaName: string) => {
      const count = getTalukaCount(talukaName);
      setTooltip((prev) =>
        prev && prev.name === talukaName && prev.count === count
          ? prev
          : { name: talukaName, count },
      );
    },
    [getTalukaCount],
  );

  const handleVillageMouseEnter = useCallback(
    (villageName: string) => {
      const count = getVillageCount(villageName);
      setTooltip((prev) =>
        prev && prev.name === villageName && prev.count === count
          ? prev
          : { name: villageName, count },
      );
    },
    [getVillageCount],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleDistrictClick = useCallback((geoName: string) => {
    setSelectedDistrict(geoName);
    setSelectedTaluka(null);
    setLevel("taluka");
    setTooltip(null);
    setVillageGeo(null);
  }, []);

  const handleTalukaClick = useCallback((talukaName: string) => {
    setSelectedTaluka(talukaName);
    setLevel("village");
    setTooltip(null);
    setVillageGeo(null);
  }, []);

  const handleBack = useCallback(() => {
    if (level === "village") {
      setLevel("taluka");
      setSelectedTaluka(null);
      setVillageGeo(null);
      setTooltip(null);
      return;
    }

    setLevel("district");
    setSelectedDistrict(null);
    setSelectedTaluka(null);
    setTalukaGeo(null);
    setVillageGeo(null);
    setTooltip(null);
  }, [level]);

  // ── Projections ──────────────────────────────────────────────────────────

  const districtProjection = useMemo(
    () => ({
      scale: 5000,
      center: [76.65, 18.75] as [number, number],
    }),
    [],
  );

  const talukaProjection = useMemo(() => {
    if (!selectedDistrict) return districtProjection;
    const cfg = DISTRICT_PROJECTION[selectedDistrict];
    if (!cfg) return districtProjection;
    return { center: cfg.center, scale: cfg.scale };
  }, [selectedDistrict, districtProjection]);

  const villageProjection = useMemo(() => {
    if (!villageGeo) return talukaProjection;

    const bounds = geoBounds(villageGeo);
    const center: [number, number] = [
      (bounds[0][0] + bounds[1][0]) / 2,
      (bounds[0][1] + bounds[1][1]) / 2,
    ];

    return {
      center,
      scale: 70000,
    };
  }, [villageGeo, talukaProjection]);

  if (loadingData) {
    return <Skeleton className="h-full w-full rounded-2xl bg-surface-container-low" />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] border border-primary/15 bg-[#e8eee2] p-4 md:p-6 select-none">
      {/* decorative footer scene */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 opacity-35">
        <img
          src={getFooterScene(level)}
          alt=""
          aria-hidden
          loading="lazy"
          className="h-24 w-full object-cover object-bottom md:h-28"
        />
      </div>

      {/* title */}
      <div className="relative z-10 mb-3 flex items-center justify-center gap-3">
        {level !== "district" && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 rounded-xl border border-primary/30 bg-white/80 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {level === "village" ? "Back to Talukas" : "All Districts"}
          </button>
        )}
        <div className="text-center">
          <h3 className="font-headline text-2xl font-semibold text-primary md:text-4xl">
            Registered Farmers
          </h3>
          <div className="mx-auto mt-2 h-[2px] w-14 rounded-full bg-primary/40" />
        </div>
      </div>

      {/* map + info panel */}
      <div className="relative z-10 grid h-[460px] grid-cols-1 gap-4 lg:grid-cols-[1.7fr_0.9fr] lg:items-center">
        {/* Map canvas - Cleaned up redundant styles to prevent animation event blockages */}
        <div
          ref={mapRef}
          className="relative h-full overflow-hidden rounded-2xl"
          onMouseLeave={handleMouseLeave}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={level + (selectedDistrict ?? "") + (selectedTaluka ?? "")}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="h-full w-full font-sans"
            >
              {level === "district" ? (
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={districtProjection}
                  className="h-full w-full"
                >
                  <Geographies geography={DISTRICT_GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const geoName = geo.properties.NAME_2 as string;
                        const display = DISTRICT_DISPLAY[geoName] ?? geoName;
                        const count   = getDistrictCount(geoName);
                        const hovered = tooltip?.name === display;

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fillColor(count, hovered)}
                            stroke="#f4f8ef"
                            strokeWidth={1.15}
                            style={{
                              default: {
                                outline: "none",
                                cursor: "pointer",
                                transition: "fill 220ms ease, stroke-width 220ms ease",
                                vectorEffect: "non-scaling-stroke",
                              },
                              hover: { outline: "none", strokeWidth: 1.35 },
                              pressed: { outline: "none" },
                            }}
                            onMouseEnter={() => handleDistrictMouseEnter(geoName)}
                            onClick={() => handleDistrictClick(geoName)}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
              ) : level === "taluka" ? (
                loadingGeo ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="rounded-xl border border-primary/20 bg-white/90 px-4 py-2 text-sm text-primary shadow">
                      Loading talukas…
                    </div>
                  </div>
                ) : talukaGeo ? (
                  <ComposableMap
                    projection="geoMercator"
                    projectionConfig={talukaProjection}
                    className="h-full w-full"
                  >
                    <Geographies geography={talukaGeo}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const talukaName = (
                            geo.properties.taluka ??
                            geo.properties.TALUKA ??
                            geo.properties.NAME_3 ??
                            geo.properties.name ??
                            ""
                          ) as string;
                          const count = getTalukaCount(talukaName);
                          const hovered = tooltip?.name === talukaName;

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={fillColor(count, hovered)}
                              stroke="#f4f8ef"
                              strokeWidth={1.0}
                              style={{
                                default: {
                                  outline: "none",
                                  cursor: "pointer",
                                  transition: "fill 220ms ease, stroke-width 220ms ease",
                                },
                                hover: { outline: "none", strokeWidth: 1.2 },
                                pressed: { outline: "none" },
                              }}
                              onMouseEnter={() => handleTalukaMouseEnter(talukaName)}
                              onClick={() => handleTalukaClick(talukaName)}
                            />
                          );
                        })
                      }
                    </Geographies>
                  </ComposableMap>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-on-surface-variant">
                    No taluka boundaries available.
                  </div>
                )
              ) : loadingVillage ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="rounded-xl border border-primary/20 bg-white/90 px-4 py-2 text-sm text-primary shadow">
                    Loading villages…
                  </div>
                </div>
              ) : villageGeo ? (
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={villageProjection}
                  className="h-full w-full"
                >
                  <Geographies geography={villageGeo}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const villageName = (
                          geo.properties.village ??
                          geo.properties.VILLAGE ??
                          geo.properties.name ??
                          ""
                        ) as string;
                        const count = getVillageCount(villageName);
                        const hovered = tooltip?.name === villageName;

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fillColor(count, hovered)}
                            stroke="#f4f8ef"
                            strokeWidth={0.9}
                            style={{
                              default: {
                                outline: "none",
                                cursor: "pointer",
                                transition: "fill 220ms ease, stroke-width 220ms ease",
                              },
                              hover: { outline: "none", strokeWidth: 1.1 },
                              pressed: { outline: "none" },
                            }}
                            onMouseEnter={() => handleVillageMouseEnter(villageName)}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-on-surface-variant">
                  No village boundaries available.
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Info panel */}
        <div className="flex h-full w-full items-start justify-start p-6">
          <div className="w-[290px] text-center">
            <h2 className="text-[36px] font-medium leading-none text-[#5e6472]">
              {panelTitle}
            </h2>

            <div className="mt-4 overflow-hidden rounded-2xl border border-[#d3e2d6] bg-white shadow-sm transition-all duration-300">
              <div className="px-5 py-4">
                <p className="text-sm font-medium text-[#2d6a4f]">Total Beneficiaries</p>
                <p className="mt-1 text-[46px] font-semibold leading-none tracking-tight text-[#2f3e46]">
                  {totalFarmers.toLocaleString("en-IN")}
                </p>
              </div>

              {tooltip && (
                <>
                  <div className="h-px w-full bg-[#d9e5dc]" />
                  <div className="h-[120px] px-5 py-4">
                    <div className="h-full translate-y-0 opacity-100 transition-all duration-300">
                      <p className="text-sm font-medium uppercase text-[#40916c] truncate">
                        {tooltip.name}
                      </p>
                      <p className="mt-2 text-[42px] font-semibold leading-none tracking-tight text-[#2f3e46]">
                        {tooltip.count.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}