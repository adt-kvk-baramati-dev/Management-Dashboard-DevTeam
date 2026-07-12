import { Router } from "express";
import { ObjectId } from "mongodb";
import { getRequester } from "../services/auth";
import { getDb } from "../services/db";
import { getCollection, extractFieldVisitFields } from "../utils/helpers";
import type { EmployeeActivityDocument } from "../types";

const router = Router();

// POST /api/field-visits
router.post("/", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const prn = String(req.body?.prn ?? "").trim();
    const farmer_name = String(req.body?.farmer_name ?? "").trim();
    const visit_date = String(req.body?.visit_date ?? "").trim();

    if (!prn || !farmer_name || !visit_date) {
      return res.status(400).json({ message: "PRN, farmer name and visit date are required." });
    }

    const db = await getDb();
    const fieldVisitsCollection = getCollection(db, "field_visits");

    const extractedFields = extractFieldVisitFields(req.body) as Record<string, any>;
    const insertDoc = {
      ...extractedFields,
      employee_id: requester.userId,
      employee_name: requester.email,
      created_at: new Date(),
    };

    const insert = await fieldVisitsCollection.insertOne(insertDoc);

    const village = (insertDoc as any).village ?? "";
    const taluka = (insertDoc as any).taluka ?? "";
    const district = (insertDoc as any).district ?? "";

    try {
      await getCollection(db, "employee_activities").insertOne({
        employee_id: requester.userId,
        activity_type: "field_visit",
        date: visit_date ? new Date(visit_date) : new Date(),
        location: [village, taluka, district].filter(Boolean).join(", "),
        description: `Field visit recorded for ${farmer_name} (${prn})`,
        created_at: new Date(),
      } as EmployeeActivityDocument);
    } catch (activityError) {
      console.warn("Unable to create linked field_visit activity:", activityError);
    }

    return res.status(201).json({
      message: "Field visit recorded successfully.",
      field_visit: {
        id: insert.insertedId.toString(),
        employee_id: insertDoc.employee_id,
        employee_name: insertDoc.employee_name,
        prn, farmer_name, visit_date,
        disease_image: (insertDoc as any).disease_image,
        geo_tag_image: (insertDoc as any).geo_tag_image,
        created_at: insertDoc.created_at,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to create field visit." });
  }
});

// GET /api/field-visits
router.get("/", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const db = await getDb();
    const fieldVisits = getCollection(db, "field_visits");

    const filter: Record<string, unknown> = {};
    if (requester.role === "employee") filter.employee_id = requester.userId;

    const rows = await fieldVisits.find(filter).sort({ created_at: -1 }).toArray();

    return res.json({
      field_visits: rows.map((row) => {
        const { _id, ...rest } = row;
        return { id: _id?.toString(), ...rest };
      }),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to fetch field visits." });
  }
});

// GET /api/field-visits/:id
router.get("/:id", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const db = await getDb();
    const fieldVisits = getCollection(db, "field_visits");

    let objId: ObjectId;
    try { objId = new ObjectId(req.params.id); } catch {
      return res.status(400).json({ message: "Invalid ID format." });
    }

    const visit = await fieldVisits.findOne({ _id: objId });
    if (!visit) return res.status(404).json({ message: "Field visit not found." });
    if (requester.role === "employee" && visit.employee_id !== requester.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { _id, ...rest } = visit;
    return res.json({ id: _id?.toString(), ...rest });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to fetch field visit." });
  }
});

// PUT /api/field-visits/:id
router.put("/:id", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const db = await getDb();
    const fieldVisits = getCollection(db, "field_visits");

    let objId: ObjectId;
    try { objId = new ObjectId(req.params.id); } catch {
      return res.status(400).json({ message: "Invalid ID format." });
    }

    const visit = await fieldVisits.findOne({ _id: objId });
    if (!visit) return res.status(404).json({ message: "Field visit not found." });
    if (requester.role === "employee" && visit.employee_id !== requester.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const extractedFields = extractFieldVisitFields(req.body);
    const updateResult = await fieldVisits.updateOne({ _id: objId }, { $set: extractedFields });

    return res.json({ message: "Field visit updated successfully.", modifiedCount: updateResult.modifiedCount });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to update field visit." });
  }
});

// PATCH /api/field-visits/:id
router.patch("/:id", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const db = await getDb();
    const fieldVisits = getCollection(db, "field_visits");

    let objId: ObjectId;
    try { objId = new ObjectId(req.params.id); } catch {
      return res.status(400).json({ message: "Invalid ID format." });
    }

    const visit = await fieldVisits.findOne({ _id: objId });
    if (!visit) return res.status(404).json({ message: "Field visit not found." });
    if (requester.role === "employee" && visit.employee_id !== requester.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const extractedFields = extractFieldVisitFields(req.body);
    const updateResult = await fieldVisits.updateOne({ _id: objId }, { $set: extractedFields });

    return res.json({ message: "Field visit updated successfully.", modifiedCount: updateResult.modifiedCount });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to patch field visit." });
  }
});

export default router;
