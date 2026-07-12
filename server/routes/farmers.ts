import { Router } from "express";
import { ObjectId } from "mongodb";
import { getRequester } from "../services/auth";
import { getDb } from "../services/db";
import { getCollection } from "../utils/helpers";
import type { FarmerResponse, LegacyFarmerDocument } from "../types";

const router = Router();

// GET /api/farmers
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const register = getCollection(db, "Farmers");
    const rows = await register.find({}).sort({ created_at: -1 }).toArray();

    return res.json({
      farmers: rows.map((row) => ({
        id: row._id?.toString() ?? "",
        prn: row.prn_no ?? "",
        name: row.farmer_name || row.name || "",
        phone: row.phone || row.mobile || "",
        address: row.village || "Unknown",
        taluka: row.taluka || "Unknown",
        district: row.district || "Unknown",
        state: "Maharashtra",
        crop: row.complaint_type || "N/A",
        farmSize: "N/A",
        lastVisit: row.created_at ? new Date(row.created_at).toISOString().split("T")[0] : "N/A",
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to load farmers." });
  }
});

// POST /api/farmers
router.post("/", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });
    if (requester.role !== "admin" && requester.role !== "employee") {
      return res.status(403).json({ message: "Only admin or employee can add farmers." });
    }

    const prnNo = String(req.body?.prn_no ?? "").trim();
    const name = String(req.body?.name ?? "").trim();
    const phone = String(req.body?.phone ?? "").trim();
    const district = String(req.body?.district ?? "").trim();
    const village = String(req.body?.village ?? "").trim();
    const taluka = String(req.body?.taluka ?? "").trim();

    if (!prnNo || !name || !phone || !district || !village) {
      return res.status(400).json({ message: "prn_no, name, phone, district, village are required." });
    }

    const db = await getDb();
    const register = getCollection(db, "Farmers");

    const existing = await register.findOne({ prn_no: prnNo });
    if (existing) return res.status(409).json({ message: "Farmer with this PRN already exists." });

    const insert = await register.insertOne({
      prn_no: prnNo, farmer_name: name, name, mobile: phone, phone, district, taluka, village,
      role: "farmer", created_by: requester.userId, created_at: new Date(),
    });

    const createdFarmer = await register.findOne({ _id: insert.insertedId });
    return res.status(201).json({
      message: "Farmer created successfully.",
      farmer: createdFarmer
        ? {
            id: createdFarmer._id!.toString(), prn_no: createdFarmer.prn_no,
            name: createdFarmer.farmer_name, phone: createdFarmer.phone,
            district: createdFarmer.district, taluka: createdFarmer.taluka ?? "",
            village: createdFarmer.village,
          }
        : null,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to create farmer." });
  }
});

// GET /api/farmers/mobile/:mobile — must come before /:prnNo
router.get("/mobile/:mobile", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const mobile = String(req.params.mobile ?? "").trim();
    if (!mobile) return res.status(400).json({ message: "Mobile number is required." });

    const db = await getDb();
    const register = getCollection(db, "Farmers");
    const farmer = await register.findOne({ $or: [{ phone: mobile }, { mobile: mobile }] });
    if (!farmer) return res.status(404).json({ message: "Farmer not found." });

    return res.json({
      farmer: {
        id: farmer._id!.toString(), prn_no: farmer.prn_no, name: farmer.farmer_name,
        phone: farmer.phone, district: farmer.district, taluka: farmer.taluka ?? "", village: farmer.village,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to fetch farmer." });
  }
});

// GET /api/farmers/:prnNo
router.get("/:prnNo", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const prnNo = String(req.params.prnNo ?? "").trim();
    if (!prnNo) return res.status(400).json({ message: "prnNo is required." });

    const db = await getDb();
    const register = getCollection(db, "Farmers");
    const farmer = await register.findOne({ prn_no: prnNo });
    if (!farmer) {
      const legacyFarmers = db.collection<LegacyFarmerDocument>("farmers");
      const legacyFarmer = await legacyFarmers.findOne({ prn_no: prnNo });
      if (legacyFarmer) {
        return res.json({
          farmer: {
            id: legacyFarmer._id!.toString(), prn_no: legacyFarmer.prn_no, name: legacyFarmer.name,
            phone: legacyFarmer.phone, district: legacyFarmer.district,
            taluka: legacyFarmer.taluka ?? "", village: legacyFarmer.village,
          } as FarmerResponse,
        });
      }
      return res.status(404).json({ message: "Farmer not found." });
    }

    return res.json({
      farmer: {
        id: farmer._id!.toString(), prn_no: farmer.prn_no, name: farmer.farmer_name,
        phone: farmer.phone, district: farmer.district, taluka: farmer.taluka ?? "", village: farmer.village,
      } as FarmerResponse,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to fetch farmer." });
  }
});

// PUT /api/farmers/:idOrPrn
router.put("/:idOrPrn", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });
    if (requester.role !== "admin" && requester.role !== "employee") {
      return res.status(403).json({ message: "Only admin or employee can edit farmers." });
    }

    const idOrPrn = String(req.params.idOrPrn ?? "").trim();
    if (!idOrPrn) return res.status(400).json({ message: "ID or PRN is required." });

    const name = String(req.body?.name ?? "").trim();
    const phone = String(req.body?.phone ?? "").trim();
    const district = String(req.body?.district ?? "").trim();
    const village = String(req.body?.village ?? "").trim();
    const taluka = String(req.body?.taluka ?? "").trim();
    const state = String(req.body?.state ?? "").trim();
    const crop = String(req.body?.crop ?? "").trim();
    const farmSize = String(req.body?.farmSize ?? "").trim();

    if (!name || !phone || !district) {
      return res.status(400).json({ message: "name, phone, and district are required." });
    }

    const db = await getDb();
    const register = getCollection(db, "Farmers");

    const updateData: Record<string, any> = {
      farmer_name: name, name, phone, mobile: phone, district, village, taluka, state, crop, farmSize,
    };

    let filter: Record<string, any> = { prn_no: idOrPrn };
    if (ObjectId.isValid(idOrPrn)) filter = { _id: new ObjectId(idOrPrn) };

    const result = await register.updateOne(filter, { $set: updateData });
    if (!result.matchedCount) return res.status(404).json({ message: "Farmer not found." });

    const updatedFarmer = await register.findOne(filter);
    return res.json({
      message: "Farmer updated successfully.",
      farmer: updatedFarmer
        ? {
            id: updatedFarmer._id!.toString(), prn_no: updatedFarmer.prn_no,
            name: updatedFarmer.farmer_name, phone: updatedFarmer.phone,
            district: updatedFarmer.district, village: updatedFarmer.village,
          }
        : null,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to update farmer." });
  }
});

// DELETE /api/farmers/:idOrPrn
router.delete("/:idOrPrn", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });
    if (requester.role !== "admin") return res.status(403).json({ message: "Only admin can delete farmers." });

    const idOrPrn = String(req.params.idOrPrn ?? "").trim();
    if (!idOrPrn) return res.status(400).json({ message: "ID or PRN is required." });

    const db = await getDb();
    const register = getCollection(db, "Farmers");

    let result = { deletedCount: 0 };
    if (ObjectId.isValid(idOrPrn)) {
      result = await register.deleteOne({ _id: new ObjectId(idOrPrn) });
    }
    if (!result.deletedCount) {
      result = await register.deleteOne({ prn_no: idOrPrn });
    }

    if (!result.deletedCount) return res.status(404).json({ message: "Farmer not found." });

    return res.json({ message: "Farmer deleted successfully.", deletedCount: result.deletedCount });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to delete farmer." });
  }
});

export default router;
