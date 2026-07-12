import { Router } from "express";
import { getDb } from "../services/db";
import {
  getCollection, normalizePrn, pickLatestByPrn,
  getRecordDate, sanitizeUploadDocument, executeBulkUpdates
} from "../utils/helpers";
import type { UploadRecord } from "../types";

const router = Router();

// GET /api/data (fetching aggregate data)
router.get("/data", async (req, res) => {
  try {
    const db = await getDb();
    const register = getCollection(db, "Farmers");
    const mapMyCrop = getCollection(db, "map_my_crop");
    const fasalHistory = getCollection(db, "fasal_history");
    const kvkData = getCollection(db, "kvk_data");

    const [farmers, mapRows, fasalRows, kvkRows] = await Promise.all([
      register.find({}).toArray(),
      mapMyCrop.find({}).toArray(),
      fasalHistory.find({}).toArray(),
      kvkData.find({}).toArray(),
    ]);

    const farmerByPrn = new Map(farmers.map((f) => [normalizePrn(f.prn_no), f]));
    const latestMapByPrn = pickLatestByPrn(mapRows as UploadRecord[]);
    const latestFasalByPrn = pickLatestByPrn(fasalRows as UploadRecord[]);
    const latestKvkByPrn = pickLatestByPrn(kvkRows as UploadRecord[]);

    const allPrns = new Set<string>([
      ...farmerByPrn.keys(),
      ...latestMapByPrn.keys(),
      ...latestFasalByPrn.keys(),
      ...latestKvkByPrn.keys(),
    ]);

    const data = Array.from(allPrns)
      .filter((prn) => prn)
      .map((prn) => {
        const farmer = farmerByPrn.get(prn);
        const mapData = latestMapByPrn.get(prn) ?? null;
        const fasalData = latestFasalByPrn.get(prn) ?? null;
        const kvk = latestKvkByPrn.get(prn) ?? null;

        return {
          date:
            mapData?.record_date ??
            fasalData?.record_date ??
            kvk?.record_date ??
            farmer?.created_at ??
            new Date(),
          prn_no: prn,
          farmer_name:
            farmer?.farmer_name ??
            kvk?.farmer_name ??
            mapData?.farm_name ??
            "Unknown",
          map_data: mapData,
          fasal_data: fasalData,
          kvk_data: kvk,
        };
      })
      .sort((a, b) => Number(b.prn_no) - Number(a.prn_no));

    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message ?? "Unable to load data." });
  }
});

// POST /api/upload
router.post("/upload", async (req, res) => {
  try {
    const records = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body?.records)
        ? req.body.records
        : null;

    if (!records || records.length === 0) {
      return res.status(400).json({ success: false, message: "records array is required." });
    }

    const db = await getDb();
    const register = getCollection(db, "Farmers");
    const mapMyCrop = getCollection(db, "map_my_crop");
    const fasalHistory = getCollection(db, "fasal_history");
    const kvkData = getCollection(db, "kvk_data");

    const registerOps: any[] = [];
    const mapMyCropOps: any[] = [];
    const fasalHistoryOps: any[] = [];
    const kvkDataOps: any[] = [];

    for (const record of records as UploadRecord[]) {
      const prn = normalizePrn(record.prn_no ?? record.prn);
      if (!prn) continue;
      const recordDate = getRecordDate(record);

      const farmerName = String(record.farmer_name ?? record.name ?? "").trim();
      const phone = String(record.phone ?? record.mobile ?? "").trim();
      const district = String(record.district ?? "").trim();
      const village = String(record.village ?? "").trim();

      if (farmerName) {
        registerOps.push({
          updateOne: {
            filter: { prn_no: prn },
            update: {
              $set: { farmer_name: farmerName, name: farmerName, phone, mobile: phone, district, village, role: "farmer" },
              $setOnInsert: { prn_no: prn, created_at: new Date() },
            },
            upsert: true,
          },
        });
      }

      if (record.map_data || record.ndvi !== undefined || record.farm_id || record.record_id) {
        const mapRaw = record.map_data && typeof record.map_data === "object" ? record.map_data : record;
        const mapData = sanitizeUploadDocument(mapRaw);
        const mapRecordId = Number(mapData.record_id ?? 0);
        const mapFilter: Record<string, unknown> = { prn_no: prn, record_date: recordDate };
        if (mapRecordId) mapFilter.record_id = mapRecordId;
        mapMyCropOps.push({
          updateOne: {
            filter: mapFilter,
            update: {
              $set: { ...mapData, prn_no: prn, record_date: recordDate, updated_at: new Date() },
              $setOnInsert: { created_at: new Date() },
            },
            upsert: true,
          },
        });
      }

      if (record.fasal_data || record.plot_name || record.cust_id) {
        const fasalRaw = record.fasal_data && typeof record.fasal_data === "object" ? record.fasal_data : record;
        const fasalData = sanitizeUploadDocument(fasalRaw);
        const fasalRecordId = Number(fasalData.record_id ?? 0);
        const fasalFilter: Record<string, unknown> = { prn_no: prn, record_date: recordDate };
        if (fasalRecordId) fasalFilter.record_id = fasalRecordId;
        fasalHistoryOps.push({
          updateOne: {
            filter: fasalFilter,
            update: {
              $set: { ...fasalData, prn_no: prn, record_date: recordDate, updated_at: new Date() },
              $setOnInsert: { created_at: new Date() },
            },
            upsert: true,
          },
        });
      }

      if (record.kvk_data || record.week || record.ph !== undefined) {
        const kvkRaw = record.kvk_data && typeof record.kvk_data === "object" ? record.kvk_data : record;
        const kvk = sanitizeUploadDocument(kvkRaw);
        const week = String(kvk.week ?? "").trim() || "Week 0";
        kvkDataOps.push({
          updateOne: {
            filter: { prn_no: prn, week, record_date: recordDate },
            update: {
              $set: {
                ...kvk, prn_no: prn, farmer_name: kvk.farmer_name ?? farmerName,
                week, record_date: recordDate, updated_at: new Date(),
              },
              $setOnInsert: { created_at: new Date() },
            },
            upsert: true,
          },
        });
      }
    }

    const [upsertedRegister, upsertedMapMyCrop, upsertedFasalHistory, upsertedKvkData] = await Promise.all([
      executeBulkUpdates(register, registerOps),
      executeBulkUpdates(mapMyCrop, mapMyCropOps),
      executeBulkUpdates(fasalHistory, fasalHistoryOps),
      executeBulkUpdates(kvkData, kvkDataOps),
    ]);

    return res.json({
      success: true,
      message: "Upload processed successfully.",
      summary: {
        recordsReceived: records.length,
        register: upsertedRegister, map_my_crop: upsertedMapMyCrop,
        fasal_history: upsertedFasalHistory, kvk_data: upsertedKvkData,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message ?? "Upload failed." });
  }
});

export default router;
