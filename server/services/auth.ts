import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getJwtSecret, requireEnvValue } from "../config/env";
import { getDb } from "./db";
import type { EmployeeRole } from "../types";

export type RequesterPayload = { userId: string; role: EmployeeRole; email: string };

export function getBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  return authorizationHeader.slice("Bearer ".length).trim();
}

export function signToken(payload: RequesterPayload): string {
  requireEnvValue(getJwtSecret(), "JWT_SECRET");
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export async function getRequester(authHeader?: string): Promise<RequesterPayload | null> {
  const token = getBearerToken(authHeader);
  if (!token) return null;

  requireEnvValue(getJwtSecret(), "JWT_SECRET");

  let decoded: any;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }

  const userId = String(decoded?.userId ?? "").trim();
  if (!userId || !ObjectId.isValid(userId)) return null;

  const db = await getDb();
  const employees = db.collection<{ _id: ObjectId; role: EmployeeRole; email: string }>("employees");
  const employee = await employees.findOne({ _id: new ObjectId(userId) });
  if (!employee) return null;
  if (employee.role !== "admin" && employee.role !== "employee") return null;

  return {
    userId: employee._id.toString(),
    role: employee.role,
    email: employee.email,
  };
}
