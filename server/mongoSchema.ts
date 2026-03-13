import type { Db } from "mongodb";

export const KVK_COLLECTIONS = [
  "admin",
  "complaints",
  "employee_activities",
  "employees",
  "farmer_visits",
  "fasal_history",
  "kvk_data",
  "map_feedback",
  "map_my_crop",
  "outreach_programmes",
  "register",
  "user_login",
  "users",
] as const;

export async function ensureMongoCollections(db: Db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));

  for (const name of KVK_COLLECTIONS) {
    if (!existing.has(name)) {
      await db.createCollection(name);
    }
  }

  await Promise.all([
    db.collection("admin").createIndex({ email: 1 }, { unique: true }),
    db.collection("employees").createIndex({ email: 1 }, { unique: true }),
    db.collection("employees").createIndex({ role: 1 }),
    db.collection("register").createIndex({ prn_no: 1 }, { unique: true }),
    db.collection("complaints").createIndex({ prn_no: 1 }),
    db.collection("complaints").createIndex({ solve_status: 1 }),
    db.collection("complaints").createIndex({ assigned_to: 1 }),
    db.collection("fasal_history").createIndex({ prn_no: 1, record_date: -1 }),
    db.collection("map_my_crop").createIndex({ prn_no: 1, record_date: -1 }),
    db.collection("kvk_data").createIndex({ prn_no: 1, record_date: -1 }),
  ]);
}
