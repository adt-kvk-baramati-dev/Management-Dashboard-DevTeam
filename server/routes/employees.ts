import { Router } from "express";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getRequester } from "../services/auth";
import { getDb, toEmployeeResponse, getNextEmployeeId } from "../services/db";
import { getCollection } from "../utils/helpers";
import { STANDARDIZED_WORK_ROLES } from "../../shared/appConstants";

const router = Router();

// GET /api/employees
router.get("/", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const role = String(req.query.role ?? "").trim();
    const db = await getDb();
    const employees = getCollection(db, "employees");

    const filter: Record<string, unknown> = {};
    if (role === "admin" || role === "employee") filter.role = role;

    const rows = await employees.find(filter).sort({ created_at: -1 }).toArray();
    return res.json({ employees: rows.map(toEmployeeResponse) });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to load employees." });
  }
});

// POST /api/employees
router.post("/", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });
    if (requester.role !== "admin") return res.status(403).json({ message: "Only admin can add employees." });

    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "").trim();
    const domain = String(req.body?.domain ?? "").trim() || null;
    const contact = String(req.body?.contact ?? "").trim() || null;
    const dob = String(req.body?.dob ?? "").trim() || null;
    const gender = String(req.body?.gender ?? "").trim() || null;
    const address = String(req.body?.address ?? "").trim() || null;

    if (domain && !STANDARDIZED_WORK_ROLES.includes(domain as (typeof STANDARDIZED_WORK_ROLES)[number])) {
      return res.status(400).json({ message: "Select a valid standardized domain." });
    }
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }

    const db = await getDb();
    const employees = getCollection(db, "employees");

    const existing = await employees.findOne({ email });
    if (existing) return res.status(409).json({ message: "Employee with this email already exists." });

    const password_hash = await bcrypt.hash(password, 10);
    const employee_id = await getNextEmployeeId(employees);

    await employees.insertOne({
      employee_id, name, role: "employee", email, domain, contact, dob, gender, address,
      password_hash, created_at: new Date(),
    });

    return res.status(201).json({
      message: "Employee created successfully.",
      employee: { id: employee_id, name, email, contact, dob, gender, domain, address, role: "employee", created_at: new Date() },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to create employee." });
  }
});

// PUT /api/employees/profile
router.put("/profile", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const db = await getDb();
    const employees = getCollection(db, "employees");

    const hasProfilePhoto = typeof req.body.profile_photo === "string" && req.body.profile_photo.trim().length > 0;
    const domainExpertise = String(req.body.domain_expertise ?? "").trim() || null;

    if (domainExpertise && !STANDARDIZED_WORK_ROLES.includes(domainExpertise as (typeof STANDARDIZED_WORK_ROLES)[number])) {
      return res.status(400).json({ message: "Select a valid standardized domain expertise." });
    }

    const updateData = {
      name: req.body.name, email: req.body.email, contact: req.body.contact,
      dob: req.body.dob, gender: req.body.gender, address: req.body.address,
      domain_expertise: domainExpertise,
      ...(hasProfilePhoto && {
        profile_photo: req.body.profile_photo.trim(),
        profile_photo_updated_at: new Date(),
      }),
    };

    const result = await employees.updateOne({ _id: new ObjectId(requester.userId) }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ message: "Employee profile not found." });

    const updatedProfile = await employees.findOne({ _id: new ObjectId(requester.userId) });
    if (!updatedProfile) return res.status(404).json({ message: "Employee profile not found." });

    return res.json({ message: "Profile updated successfully.", profile: toEmployeeResponse(updatedProfile) });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to update profile." });
  }
});

// GET /api/employees/:id
router.get("/:id", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ message: "Employee ID is required." });

    const db = await getDb();
    const employees = getCollection(db, "employees");

    let employee = await employees.findOne({ employee_id: id });
    if (!employee) {
      try { employee = await employees.findOne({ _id: new ObjectId(id) }); } catch { employee = null; }
    }
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    const employeeId = employee._id?.toString();
    const complaintsCollection = getCollection(db, "complaints");
    const activitiesCollection = getCollection(db, "employee_activities");

    const activities = await activitiesCollection
      .find({ employee_id: employee.employee_id ?? "" })
      .sort({ created_at: -1 }).toArray();

    const complaints = employeeId
      ? await complaintsCollection.find({ assignedEmployees: employeeId }).sort({ created_at: -1 }).toArray()
      : [];

    return res.json({
      employee: toEmployeeResponse(employee),
      activities: activities.map((act) => ({
        id: act._id?.toString() ?? "",
        activity_type: act.activity_type,
        date: act.date ? String(act.date) : act.created_at?.toISOString().split("T")[0] ?? "",
        location: act.location ?? "",
        description: act.description ?? "",
      })),
      complaints: complaints.map((comp) => {
        let status: "open" | "in_progress" | "resolved" | "closed" = "open";
        if (comp.solve_status === "Pending") status = "open";
        else if (comp.solve_status === "In Progress") status = "in_progress";
        else if (comp.solve_status === "Solved") status = "resolved";
        return {
          id: comp._id?.toString() ?? "",
          complaint_id: comp.complaint_id ?? comp._id?.toString() ?? "",
          title: comp.complaint_type ?? comp.complaint ?? "Complaint",
          status,
          assigned_at: comp.created_at ? comp.created_at.toISOString().split("T")[0] : "",
          progress: comp.progress || [],
        };
      }),
      samplings: [],
      outreach: [],
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to load employee details." });
  }
});

export default router;
