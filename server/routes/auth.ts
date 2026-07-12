import { Router } from "express";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getRequester, signToken } from "../services/auth";
import { getDb, toEmployeeResponse, mongoStartupError } from "../services/db";
import { getCollection } from "../utils/helpers";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ message: "Request body must be a valid JSON object." });
    }

    const email = String((body as any).email ?? "").trim().toLowerCase();
    const password = String((body as any).password ?? "").trim();

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email." });
    }

    if (mongoStartupError) {
      console.error("Login blocked due to Mongo startup error:", mongoStartupError);
    }

    const db = await getDb();
    const employees = getCollection(db, "employees");
    const employee = await employees.findOne({ email });
    if (!employee) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (!employee.password_hash) {
      return res.status(500).json({ message: "Account configuration is invalid. Please contact an administrator." });
    }

    const validPassword = await bcrypt.compare(password, employee.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = signToken({
      userId: employee._id!.toString(),
      role: employee.role,
      email: employee.email,
    });

    return res.json({
      message: "Login successful",
      token,
      profile: toEmployeeResponse(employee),
    });
  } catch (error: any) {
    console.error("Login route error:", error);
    return res.status(500).json({ message: error?.message ?? "Server error during login." });
  }
});

// GET /api/auth/profile
router.get("/profile", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const db = await getDb();
    const employees = getCollection(db, "employees");
    const profile = await employees.findOne({ _id: new ObjectId(requester.userId) });
    if (!profile) return res.status(404).json({ message: "Employee profile not found." });

    return res.json({ profile: toEmployeeResponse(profile) });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to fetch profile." });
  }
});

export default router;
