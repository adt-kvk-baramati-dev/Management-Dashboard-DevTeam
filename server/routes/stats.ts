import { Router } from "express";
import { ObjectId } from "mongodb";
import { getRequester } from "../services/auth";
import { getDb } from "../services/db";
import { getCollection } from "../utils/helpers";

const router = Router();

// GET /api/stats/admin
router.get("/admin", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester || requester.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const db = await getDb();

    const farmers = await getCollection(db, "Farmers").countDocuments();

    const complaintsCollection = getCollection(db, "complaints");
    const employeesCollection = getCollection(db, "employees");

    // NEW
    const outreachCollection = getCollection(db, "outreach_programmes");
    const fieldVisitCollection = getCollection(db, "field_visits");

    const outreachSessions = await outreachCollection.countDocuments();
    const samplingActivities = await fieldVisitCollection.countDocuments();
    const activeEmployees = await employeesCollection.countDocuments({ role: "employee" });
    const allComplaints = await complaintsCollection.find({}).toArray();

    let openComplaints = 0;
    let resolvedComplaints = 0;
    for (const c of allComplaints) {
      if (c.solve_status === "Pending" || c.solve_status === "In Progress") openComplaints++;
      else if (c.solve_status === "Solved") resolvedComplaints++;
    }

    return res.json({
      registeredFarmers: farmers,
      activeEmployees,
      openComplaints,
      resolvedComplaints,
      outreachSessions,
      samplingActivities,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to load dashboard stats." });
  }
});

// GET /api/stats/employee
router.get("/employee", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const db = await getDb();
    const complaintsCollection = getCollection(db, "complaints");
    const fieldVisitsCollection = getCollection(db, "field_visits");

    let assignedQuery: Record<string, any> = { assignedEmployees: requester.userId };

    const employeeObj = await getCollection(db, "employees").findOne({ _id: new ObjectId(requester.userId) });
    if (employeeObj && employeeObj.employee_id) {
      assignedQuery = {
        $or: [
          { assignedEmployees: requester.userId },
          { assignedEmployees: employeeObj.employee_id },
        ],
      };
    }

    const assignedComplaintsList = await complaintsCollection.find(assignedQuery).toArray();

    const pending = assignedComplaintsList.filter((c) => c.solve_status === "Pending" || c.solve_status === "In Progress").length;
    const resolved = assignedComplaintsList.filter((c) => c.solve_status === "Solved").length;

    // Note: line 3174 of index.ts had 'cleaf', changing to 'if' logic by just getting field visits
    let myVisitsCount = 0;
    if (requester.userId) {
      myVisitsCount = await fieldVisitsCollection.countDocuments({ employee_id: requester.userId });
    }

    // Outreach programmes
    let outreachCount = 0;
    if (employeeObj && employeeObj._id) {
      let resolvedId = employeeObj._id.toString();
      outreachCount = await getCollection(db, "outreach_programmes").countDocuments({ employee_id: resolvedId });
    }

    return res.json({
      pendingTasks: pending,
      resolvedTasks: resolved,
      completedVisits: myVisitsCount,
      outreachProgrammes: outreachCount,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to load employee stats." });
  }
});

export default router;
