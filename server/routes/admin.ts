import { Router } from "express";
import { ObjectId } from "mongodb";
import { getRequester } from "../services/auth";
import { getDb } from "../services/db";
import { getCollection, normalizePrn, toDate } from "../utils/helpers";
import { STANDARDIZED_WORK_ROLES } from "../../shared/appConstants";

const router = Router();

// POST /api/admin/clean-duplicates
router.post("/clean-duplicates", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin only." });

    const db = await getDb();
    const farmers = await getCollection(db, "Farmers").find({}).sort({ created_at: -1 }).toArray();

    const seen = new Set();
    const duplicates = [];
    for (const f of farmers) {
      const p = normalizePrn(f.prn_no);
      if (seen.has(p)) duplicates.push(f._id);
      else seen.add(p);
    }

    if (duplicates.length) {
      await getCollection(db, "Farmers").deleteMany({ _id: { $in: duplicates as ObjectId[] } });
    }

    return res.json({ success: true, removed: duplicates.length });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Cleanup failed." });
  }
});

// POST /api/admin/reset-roles
router.post("/reset-roles", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin only." });

    const db = await getDb();
    const result = await getCollection(db, "Farmers").updateMany({}, { $set: { role: "farmer" } });

    return res.json({ success: true, updated: result.modifiedCount });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Reset failed." });
  }
});

// GET /api/admin/daily-report
router.get("/daily-report", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester || requester.role !== "admin") return res.status(401).json({ message: "Unauthorized" });

    const dateStr = String(req.query.date ?? "").trim();
    if (!dateStr) return res.status(400).json({ message: "Date is required." });

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const db = await getDb();
    const activities = await getCollection(db, "employee_activities").find({
      $or: [
        { date: { $gte: date, $lt: nextDate } },
        { created_at: { $gte: date, $lt: nextDate } }
      ]
    }).toArray();

    const employeeIds = Array.from(new Set(activities.map(a => a.employee_id))).filter(Boolean);
    const employees = await getCollection(db, "employees").find({
      $or: [
        { employee_id: { $in: employeeIds } },
        { _id: { $in: employeeIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) as ObjectId[] } }
      ]
    }).toArray();

    const getEmpName = (id: string) => {
      const emp = employees.find(e => e.employee_id === id || e._id?.toString() === id);
      return emp?.name || id;
    };

    return res.json({
      report: activities.map(a => ({
        id: a._id?.toString(),
        employee_name: getEmpName(a.employee_id),
        activity_type: a.activity_type,
        location: a.location ?? "Unknown",
        description: a.description ?? "",
        time: a.created_at ? new Date(a.created_at).toLocaleTimeString() : "Unknown"
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to load daily report." });
  }
});

// POST /api/admin/notifications
router.post("/notifications", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin only." });

    const message = String(req.body.message ?? "").trim();
    const type = String(req.body.type ?? "info").trim();
    if (!message) return res.status(400).json({ message: "Message is required." });

    const db = await getDb();
    const insert = await getCollection(db, "notifications").insertOne({
      message, type, sent_by: requester.userId, sent_at: new Date()
    });

    return res.json({
      message: "Notification sent successfully.",
      notification: { id: insert.insertedId.toString(), message, type, sent_at: new Date() }
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Failed to send notification." });
  }
});

// GET /api/admin/sampling
router.get("/sampling", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const db = await getDb();
    const mapFeedback = await getCollection(db, "map_feedback").find({}).sort({ created_at: -1 }).toArray();

    return res.json({
      samplingRecords: mapFeedback.map((row) => ({
        id: row._id?.toString(),
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        prn: row.prn,
        farmer_name: row.farmer_name,
        mobile: row.mobile,
        plantation_date: row.plantation_date,
        district: row.district,
        taluka: row.taluka,
        village: row.village,
        ndvi_image: row.ndvi_image,
        evi_image: row.evi_image,
        crop_image: row.crop_image,
        water_image: row.water_image,
        growth_image: row.growth_image,
        vra_image: row.vra_image,
        mmc_image: row.mmc_image,
        fasal_image: row.fasal_image,
        remark: row.remark,
        created_at: row.created_at,
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to fetch sampling records." });
  }
});

// GET /api/admin/farmer-locations
router.get("/farmer-locations", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin only." });

    const db = await getDb();
    const farmers = await getCollection(db, "Farmers").find({}).toArray();

    return res.json({
      farmers: farmers.map(f => ({
        id: f._id?.toString() ?? "",
        prn_no: f.prn_no ?? "",
        farmer_name: f.farmer_name ?? f.name ?? "",
        district: f.district ?? "",
        taluka: f.taluka ?? "",
        village: f.village ?? "",
        location_label: [f.village, f.taluka, f.district].filter(Boolean).join(", ")
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Failed to fetch farmer locations." });
  }
});

// GET /api/admin/employees-with-stats
router.get("/employees-with-stats", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin only." });

    const db = await getDb();
    const employees = await getCollection(db, "employees").find({ role: "employee" }).toArray();
    const complaints = await getCollection(db, "complaints").find({}).toArray();
    const visits = await getCollection(db, "field_visits").find({}).toArray();
    const activities = await getCollection(db, "employee_activities").find({}).toArray();

    const employeeStats = employees.map(emp => {
      const empId = emp._id?.toString() ?? "";
      
      const empComplaints = complaints.filter(c => {
        if (!Array.isArray(c.assignedEmployees)) return false;
        return c.assignedEmployees.includes(empId) || (emp.employee_id && c.assignedEmployees.includes(emp.employee_id));
      });
      
      const open = empComplaints.filter(c => c.solve_status === "Pending" || c.solve_status === "In Progress").length;
      const solved = empComplaints.filter(c => c.solve_status === "Solved").length;
      
      const empVisits = visits.filter(v => v.employee_id === empId || v.employee_id === emp.employee_id).length;
      const empActivities = activities.filter(a => a.employee_id === empId || a.employee_id === emp.employee_id).length;

      return {
        id: empId,
        name: emp.name ?? "Unknown",
        domain: emp.domain ?? "Unknown",
        email: emp.email ?? "",
        contact: emp.contact ?? "",
        stats: {
          assignedComplaints: empComplaints.length,
          openComplaints: open,
          solvedComplaints: solved,
          fieldVisits: empVisits,
          totalActivities: empActivities
        }
      };
    });

    return res.json({ employees: employeeStats });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Failed to fetch employee stats." });
  }
});

export default router;
