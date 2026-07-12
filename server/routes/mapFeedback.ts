import { Router } from "express";
import { getRequester } from "../services/auth";
import { getDb } from "../services/db";
import { getCollection } from "../utils/helpers";
import type { MapFeedbackDocument, EmployeeActivityDocument } from "../types";

const router = Router();

// POST /api/map-feedback
router.post("/", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const prn = String(req.body?.prn ?? "").trim();
    const farmer_name = String(req.body?.farmer_name ?? "").trim();
    const mobile = String(req.body?.mobile ?? "").trim();
    const plantation_date = String(req.body?.plantation_date ?? "").trim();
    const district = String(req.body?.district ?? "").trim();
    const taluka = String(req.body?.taluka ?? "").trim();
    const village = String(req.body?.village ?? "").trim();

    if (!prn || !farmer_name || !mobile || !plantation_date) {
      return res.status(400).json({ message: "PRN, farmer name, mobile and plantation date are required." });
    }
    if (!/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({ message: "Mobile number must be exactly 10 digits." });
    }

    const db = await getDb();
    const mapFeedbackCollection = getCollection(db, "map_feedback");

    const mapKeys = ["ndvi", "evi", "crop_stress", "water_watch", "early_growth", "vra", "mmc", "fasal"];
    const mapData: Record<string, any> = {};

    for (const key of mapKeys) {
      mapData[`${key}_image`] = String(req.body?.maps?.[key]?.image ?? "").trim();
      mapData[`${key}_interpretation`] = String(req.body?.maps?.[key]?.interpretation ?? "").trim();
      mapData[`${key}_feedback`] = String(req.body?.maps?.[key]?.feedback ?? "").trim();
    }

    const insertDoc: MapFeedbackDocument = {
      employee_id: requester.userId, employee_name: requester.email,
      prn, farmer_name, mobile, plantation_date, district, taluka, village,
      ndvi_image: mapData.ndvi_image, ndvi_interpretation: mapData.ndvi_interpretation, ndvi_feedback: mapData.ndvi_feedback,
      evi_image: mapData.evi_image, evi_interpretation: mapData.evi_interpretation, evi_feedback: mapData.evi_feedback,
      crop_image: mapData.crop_stress_image, crop_interpretation: mapData.crop_stress_interpretation, crop_feedback: mapData.crop_stress_feedback,
      water_image: mapData.water_watch_image, water_interpretation: mapData.water_watch_interpretation, water_feedback: mapData.water_watch_feedback,
      growth_image: mapData.early_growth_image, growth_interpretation: mapData.early_growth_interpretation, growth_feedback: mapData.early_growth_feedback,
      vra_image: mapData.vra_image, vra_interpretation: mapData.vra_interpretation, vra_feedback: mapData.vra_feedback,
      mmc_image: mapData.mmc_image, mmc_interpretation: mapData.mmc_interpretation, mmc_feedback: mapData.mmc_feedback,
      fasal_image: mapData.fasal_image, fasal_interpretation: mapData.fasal_interpretation, fasal_feedback: mapData.fasal_feedback,
      remark: String(req.body?.remark ?? "").trim(),
      created_at: new Date(),
    };

    const insert = await mapFeedbackCollection.insertOne(insertDoc);

    try {
      await getCollection(db, "employee_activities").insertOne({
        employee_id: requester.userId, activity_type: "sampling",
        date: plantation_date ? new Date(plantation_date) : new Date(),
        location: [village, taluka, district].filter(Boolean).join(", "),
        description: `Random sampling feedback submitted for ${farmer_name} (${prn})`,
        created_at: new Date(),
      } as EmployeeActivityDocument);
    } catch (activityError) {
      console.warn("Unable to create linked sampling activity:", activityError);
    }

    return res.status(201).json({
      message: "Map feedback submitted successfully.",
      map_feedback: {
        id: insert.insertedId.toString(), employee_id: insertDoc.employee_id,
        employee_name: insertDoc.employee_name, prn, farmer_name, plantation_date, created_at: insertDoc.created_at,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to create map feedback." });
  }
});

// GET /api/map-feedback
router.get("/", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const db = await getDb();
    const mapFeedback = getCollection(db, "map_feedback");

    const filter: Record<string, unknown> = {};
    if (requester.role === "employee") filter.employee_id = requester.userId;

    const rows = await mapFeedback.find(filter).sort({ created_at: -1 }).toArray();

    return res.json({
      map_feedback: rows.map((row) => ({
        id: row._id?.toString(), employee_id: row.employee_id, employee_name: row.employee_name,
        prn: row.prn, farmer_name: row.farmer_name, mobile: row.mobile, plantation_date: row.plantation_date,
        district: row.district, taluka: row.taluka, village: row.village,
        ndvi_image: row.ndvi_image, evi_image: row.evi_image, crop_image: row.crop_image,
        water_image: row.water_image, growth_image: row.growth_image, vra_image: row.vra_image,
        mmc_image: row.mmc_image, fasal_image: row.fasal_image,
        remark: row.remark, created_at: row.created_at,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to fetch map feedback." });
  }
});

export default router;
