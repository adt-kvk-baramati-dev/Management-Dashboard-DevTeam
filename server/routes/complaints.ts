import { Router } from "express";
import { ObjectId } from "mongodb";
import { getRequester } from "../services/auth";
import { getDb } from "../services/db";
import { getCollection, normalizeAssignedEmployees, normalizeComparisonValue } from "../utils/helpers";
import { COMPLAINT_CATEGORIES } from "../../shared/appConstants";

const router = Router();

// POST /api/complaints
router.post("/", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const prn_no = String(req.body?.prn_no ?? "").trim();
    const farmer_name = String(req.body?.farmer_name ?? "").trim();
    const complaint_date = String(req.body?.complaint_date ?? "").trim();
    const mobile = String(req.body?.mobile ?? "").trim();
    const district = String(req.body?.district ?? "").trim();
    const taluka = String(req.body?.taluka ?? "").trim();
    const village = String(req.body?.village ?? "").trim();
    const complaint_type = String(req.body?.complaint_type ?? "").trim();
    const complaint = String(req.body?.complaint ?? "").trim();
    const image = String(req.body?.image ?? "").trim();

    if (!prn_no || !farmer_name || !complaint_type || !complaint) {
      return res.status(400).json({ message: "PRN, farmer name, complaint type and complaint details are required." });
    }
    if (!COMPLAINT_CATEGORIES.includes(complaint_type as (typeof COMPLAINT_CATEGORIES)[number])) {
      return res.status(400).json({ message: "Select a valid complaint category." });
    }

    const db = await getDb();
    const complaintsCollection = getCollection(db, "complaints");
    const employeesCollection = getCollection(db, "employees");

    const employees = await employeesCollection.find({ role: "employee" }).toArray();
    const complaintTypeKey = normalizeComparisonValue(complaint_type);
    const matchingEmployees = employees.filter((employee) => {
      const employeeDomain = normalizeComparisonValue(employee.domain);
      const employeeExpertise = normalizeComparisonValue(employee.domain_expertise);
      return employeeDomain === complaintTypeKey || employeeExpertise === complaintTypeKey;
    });

    const assignedEmployees = matchingEmployees
      .map((employee) => employee._id?.toString())
      .filter((id): id is string => Boolean(id));

    const assignedEmployeeNames = matchingEmployees
      .map((employee) => employee.name)
      .filter((name): name is string => Boolean(name?.trim()));

    const warning =
      assignedEmployees.length === 0
        ? `No active employee found for ${complaint_type}. Complaint left unassigned.`
        : null;

    const genComplaintId = () => `CID-${Math.floor(1000 + Math.random() * 9000)}`;
    let complaint_id = genComplaintId();
    while (await complaintsCollection.findOne({ complaint_id })) {
      complaint_id = genComplaintId();
    }

    const insertDoc = {
      complaint_id, prn_no, farmer_name, complaint_date, mobile, district, taluka, village,
      complaint_type, complaint, image, solve_status: "Pending" as const,
      registered_by: requester.userId, assignedEmployees,
      created_at: new Date(), updated_at: new Date(),
      progress: [{
        date: new Date(),
        note: `Complaint created${assignedEmployees.length ? ` and assigned to ${assignedEmployeeNames.join(", ")}` : ""}`,
      }],
    };

    const insert = await complaintsCollection.insertOne(insertDoc);
    const newComplaint = await complaintsCollection.findOne({ _id: insert.insertedId });

    return res.status(201).json({
      message: "Complaint registered successfully.",
      complaint: {
        id: newComplaint?._id?.toString() ?? insert.insertedId.toString(),
        complaint_id, prn_no, farmer_name,
        registered_by: requester.userId, assignedEmployees, assignedEmployeeNames,
        complaint_type, solve_status: "Pending",
        created_at: newComplaint?.created_at, warning,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to create complaint." });
  }
});

// GET /api/complaints
router.get("/", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const status = String(req.query.status ?? "").trim();
    const db = await getDb();
    const complaints = getCollection(db, "complaints");

    const filter: Record<string, unknown> = {};
    if (status === "Pending" || status === "Solved") filter.solve_status = status;
    if (requester.role === "employee") filter.assignedEmployees = requester.userId;

    const rows = await complaints.find(filter).sort({ created_at: -1 }).toArray();

    const employeeIds = Array.from(
      new Set(
        rows.flatMap((row) => [
          ...normalizeAssignedEmployees(row.assignedEmployees),
          String(row.registered_by ?? "").trim(),
        ]),
      ),
    )
      .map((id) => { try { return new ObjectId(id); } catch { return null; } })
      .filter(Boolean) as ObjectId[];

    const employees = employeeIds.length
      ? await getCollection(db, "employees").find({ _id: { $in: employeeIds } }).toArray()
      : [];

    const employeeMap = new Map<string, string>(
      employees.map((emp) => [emp._id?.toString() ?? "", emp.name]),
    );

    return res.json({
      complaints: rows.map((row) => ({
        id: row._id!.toString(),
        complaint_id: row.complaint_id ?? row._id!.toString(),
        prn_no: row.prn_no,
        farmer_name: row.farmer_name,
        phone: row.mobile ?? "",
        subject: row.subject ?? "",
        complaint: row.complaint ?? row.issue ?? "",
        image: row.image ?? null,
        domain: row.complaint_type ?? row.subject ?? "General",
        complaint_type: row.complaint_type ?? "General",
        district: row.district ?? "",
        taluka: row.taluka ?? "",
        village: row.village ?? "",
        solve_status: row.solve_status ?? "Pending",
        solved_by: row.solved_by ?? null,
        solved_by_name: row.solved_by_name ?? null,
        solved_remark: row.solved_remark ?? null,
        registered_by: row.registered_by ?? null,
        registered_by_name: row.registered_by
          ? employeeMap.get(String(row.registered_by)) ?? "Unknown"
          : "Unknown",
        assignedEmployees: normalizeAssignedEmployees(row.assignedEmployees),
        assignedEmployeeNames: normalizeAssignedEmployees(row.assignedEmployees).map(
          (id) => employeeMap.get(id) ?? "Unknown",
        ),
        created_at: row.created_at,
        updated_at: row.updated_at ?? row.created_at,
        progress: row.progress || [{ date: row.created_at, note: "Complaint registered" }],
        resolution_notes: row.resolution_notes ?? "",
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to fetch complaints." });
  }
});

// GET /api/complaints/:id
router.get("/:id", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const complaintId = String(req.params.id ?? "").trim();
    if (!ObjectId.isValid(complaintId)) return res.status(400).json({ message: "Invalid complaint ID." });

    const db = await getDb();
    const complaint = await getCollection(db, "complaints").findOne({ _id: new ObjectId(complaintId) });
    if (!complaint) return res.status(404).json({ message: "Complaint not found." });

    if (requester.role === "employee" && !normalizeAssignedEmployees(complaint.assignedEmployees).includes(requester.userId)) {
      return res.status(403).json({ message: "You don't have access to this complaint." });
    }

    const assignedEmployeeIds = normalizeAssignedEmployees(complaint.assignedEmployees);
    const assignedEmployees = assignedEmployeeIds.length
      ? await getCollection(db, "employees")
          .find({ _id: { $in: assignedEmployeeIds.map((id) => new ObjectId(id)) } })
          .toArray()
      : [];
    const assignedEmployeeNames = assignedEmployeeIds.map(
      (id) => assignedEmployees.find((e) => e._id?.toString() === id)?.name ?? "Unknown",
    );

    const registeredByEmployee = complaint.registered_by
      ? await getCollection(db, "employees").findOne({ _id: new ObjectId(String(complaint.registered_by)) })
      : null;

    return res.json({
      id: complaint._id!.toString(),
      complaint_id: complaint.complaint_id ?? complaint._id!.toString(),
      prn_no: complaint.prn_no, farmer_name: complaint.farmer_name, phone: complaint.mobile ?? "",
      subject: complaint.subject ?? "", complaint: complaint.complaint ?? complaint.issue ?? "",
      image: complaint.image ?? null,
      domain: complaint.complaint_type ?? complaint.subject ?? "General",
      complaint_type: complaint.complaint_type ?? "General",
      district: complaint.district ?? "", taluka: complaint.taluka ?? "", village: complaint.village ?? "",
      solve_status: complaint.solve_status ?? "Pending",
      solved_by: complaint.solved_by ?? null, solved_by_name: complaint.solved_by_name ?? null,
      solved_remark: complaint.solved_remark ?? null,
      registered_by: complaint.registered_by ?? null,
      registered_by_name: registeredByEmployee?.name ?? "Unknown",
      assignedEmployees: assignedEmployeeIds, assignedEmployeeNames,
      created_at: complaint.created_at, updated_at: complaint.updated_at ?? complaint.created_at,
      progress: complaint.progress || [{ date: complaint.created_at, note: "Complaint registered" }],
      resolution_notes: complaint.resolution_notes ?? "",
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to fetch complaint." });
  }
});

// PATCH /api/complaints/:id/assign
router.patch("/:id/assign", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });
    if (requester.role !== "admin") return res.status(403).json({ message: "Only admin can assign complaints." });

    const complaintId = String(req.params.id ?? "").trim();
    const employeeId = String(req.body?.employeeId ?? "").trim();

    if (!ObjectId.isValid(complaintId) || !ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "Valid complaint and employee ids are required." });
    }

    const db = await getDb();
    const employees = getCollection(db, "employees");
    const complaints = getCollection(db, "complaints");

    const employee = await employees.findOne({ _id: new ObjectId(employeeId), role: "employee" });
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    const update = await complaints.updateOne(
      { _id: new ObjectId(complaintId) },
      { $addToSet: { assignedEmployees: employeeId }, $set: { updated_at: new Date() } },
    );

    if (!update.matchedCount) return res.status(404).json({ message: "Complaint not found." });
    return res.json({ message: "Complaint assigned successfully." });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to assign complaint." });
  }
});

// PATCH /api/complaints/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const complaintId = String(req.params.id ?? "").trim();
    const { status } = req.body;
    const remark = String(req.body?.remark ?? "").trim();

    if (!ObjectId.isValid(complaintId)) return res.status(400).json({ message: "Invalid complaint ID." });
    if (!["Pending", "In Progress", "Solved"].includes(status)) return res.status(400).json({ message: "Invalid status." });

    const db = await getDb();
    const employees = getCollection(db, "employees");
    const complaints = getCollection(db, "complaints");

    const requesterEmployee = await employees.findOne({ _id: new ObjectId(requester.userId) });
    const existingComplaint = await complaints.findOne({ _id: new ObjectId(complaintId) });
    if (!existingComplaint) return res.status(404).json({ message: "Complaint not found." });

    if (
      requester.role !== "admin" &&
      !normalizeAssignedEmployees(existingComplaint.assignedEmployees).includes(requester.userId)
    ) {
      return res.status(403).json({ message: "You can only update complaints assigned to you." });
    }

    const update = await complaints.updateOne(
      { _id: new ObjectId(complaintId) },
      {
        $set: {
          solve_status: status,
          updated_at: new Date(),
          ...(status === "Solved"
            ? {
                solved_by: requester.userId,
                solved_by_name: requesterEmployee?.name ?? requester.email ?? "Unknown",
                solved_remark: remark || null,
              }
            : {}),
        },
        $push: {
          progress: {
            date: new Date(),
            note:
              status === "Solved"
                ? `Solved by ${requesterEmployee?.name ?? requester.email ?? "Unknown"}${remark ? `: ${remark}` : ""}`
                : `Status changed to ${status} by ${requesterEmployee?.name ?? requester.email ?? requester.role}`,
          },
        },
      },
    );

    if (!update.matchedCount) return res.status(404).json({ message: "Complaint not found." });
    return res.json({ message: "Complaint status updated successfully." });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to update complaint status." });
  }
});

export default router;
