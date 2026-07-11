import { useMemo } from "react";

export type RegionLevel = "state" | "district" | "taluka" | "village";

export type FarmerLocationRecord = {
  state?: string;
  district?: string;
  taluka?: string;
  village?: string;
  count?: number;
};

export type AggregatedCount = {
  name: string;
  count: number;
};

type AggregationIndex = {
  state: AggregatedCount[];
  district: Record<string, AggregatedCount[]>;
  taluka: Record<string, AggregatedCount[]>;
  village: Record<string, AggregatedCount[]>;
};

type AggregationParent = {
  state?: string;
  district?: string;
  taluka?: string;
};

const UNKNOWN = "Unknown";

const normalize = (value?: string) => {
  const cleaned = (value ?? "").trim();
  return cleaned.length > 0 ? cleaned : UNKNOWN;
};

const addCount = (bucket: Map<string, number>, key: string, value: number) => {
  bucket.set(key, (bucket.get(key) ?? 0) + value);
};

const toSortedArray = (bucket: Map<string, number>): AggregatedCount[] =>
  Array.from(bucket.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const getDistrictParentKey = (state?: string) => normalize(state);

const getTalukaParentKey = (state?: string, district?: string) =>
  `${normalize(state)}::${normalize(district)}`;

const getVillageParentKey = (state?: string, district?: string, taluka?: string) =>
  `${normalize(state)}::${normalize(district)}::${normalize(taluka)}`;

export const useFarmerAggregation = (records: FarmerLocationRecord[]) => {
  const index = useMemo<AggregationIndex>(() => {
    const states = new Map<string, number>();
    const districtsByState = new Map<string, Map<string, number>>();
    const talukasByDistrict = new Map<string, Map<string, number>>();
    const villagesByTaluka = new Map<string, Map<string, number>>();

    for (const record of records) {
      const state = normalize(record.state);
      const district = normalize(record.district);
      const taluka = normalize(record.taluka);
      const village = normalize(record.village);
      const rowCount = Number.isFinite(record.count) ? Number(record.count) : 1;
      const districtParentKey = getDistrictParentKey(state);
      const talukaParentKey = getTalukaParentKey(state, district);
      const villageParentKey = getVillageParentKey(state, district, taluka);

      addCount(states, state, rowCount);

      if (!districtsByState.has(districtParentKey)) {
        districtsByState.set(districtParentKey, new Map<string, number>());
      }
      addCount(districtsByState.get(districtParentKey)!, district, rowCount);

      if (!talukasByDistrict.has(talukaParentKey)) {
        talukasByDistrict.set(talukaParentKey, new Map<string, number>());
      }
      addCount(talukasByDistrict.get(talukaParentKey)!, taluka, rowCount);

      if (!villagesByTaluka.has(villageParentKey)) {
        villagesByTaluka.set(villageParentKey, new Map<string, number>());
      }
      addCount(villagesByTaluka.get(villageParentKey)!, village, rowCount);
    }

    return {
      state: toSortedArray(states),
      district: Object.fromEntries(
        Array.from(districtsByState.entries()).map(([parent, map]) => [
          parent,
          toSortedArray(map),
        ]),
      ),
      taluka: Object.fromEntries(
        Array.from(talukasByDistrict.entries()).map(([parent, map]) => [
          parent,
          toSortedArray(map),
        ]),
      ),
      village: Object.fromEntries(
        Array.from(villagesByTaluka.entries()).map(([parent, map]) => [
          parent,
          toSortedArray(map),
        ]),
      ),
    };
  }, [records]);

  const getCountsByLevel = (level: RegionLevel, parent?: string | AggregationParent): AggregatedCount[] => {
    if (level === "state") {
      return index.state;
    }

    const parentObject =
      typeof parent === "string"
        ? { state: parent, district: parent, taluka: parent }
        : (parent ?? {});

    if (level === "district") {
      return index.district[getDistrictParentKey(parentObject.state)] ?? [];
    }
    if (level === "taluka") {
      return index.taluka[getTalukaParentKey(parentObject.state, parentObject.district)] ?? [];
    }
    return index.village[
      getVillageParentKey(parentObject.state, parentObject.district, parentObject.taluka)
    ] ?? [];
  };

  return {
    getCountsByLevel,
  };
};
