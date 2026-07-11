import type { Db } from "mongodb";

export const KVK_COLLECTIONS = [
  "admin",
  "complaints",
  "employee_activities",
  "employees",
  "farmer_visits",
  "field_visits",
  "fasal_history",
  "kvk_data",
  "map_feedback",
  "map_my_crop",
  "notifications",
  "outreach_programmes",
  "Farmers",
  "user_login",
  "users",
] as const;

export async function ensureMongoCollections(db: Db) {
  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map(
      (c) => c.name,
    ),
  );

  for (const name of KVK_COLLECTIONS) {
    if (!existing.has(name)) {
      await db.createCollection(name);
    }
  }

  await Promise.all([
    // Employees
    db.collection("employees").createIndex({ email: 1 }, { unique: true }),
    db.collection("employees").createIndex({ role: 1 }),

    // Farmers
    db.collection("Farmers").createIndex({ prn_no: 1 }, { unique: true }),
    db.collection("Farmers").createIndex({ district: 1 }),

    // Complaints
    db.collection("complaints").createIndex({ prn_no: 1 }),
    db.collection("complaints").createIndex({ solve_status: 1 }),
    db.collection("complaints").createIndex({ assignedEmployees: 1 }),
    db.collection("complaints").createIndex({ created_at: -1 }),

    // Field visits
    db.collection("field_visits").createIndex({ prn: 1 }),
    db.collection("field_visits").createIndex({ employee_id: 1 }),
    db.collection("field_visits").createIndex({ visit_date: -1 }),

    // Map feedback (sampling)
    db.collection("map_feedback").createIndex({ prn: 1 }),
    db.collection("map_feedback").createIndex({ employee_id: 1 }),
    db.collection("map_feedback").createIndex({ plantation_date: -1 }),

    // Employee activities
    db.collection("employee_activities").createIndex({ employee_id: 1 }),
    db.collection("employee_activities").createIndex({ activity_type: 1 }),
    db.collection("employee_activities").createIndex({ created_at: -1 }),

    // Outreach
    db.collection("outreach_programmes").createIndex({ employee_id: 1 }),
    db.collection("outreach_programmes").createIndex({ section_type: 1 }),
    db.collection("outreach_programmes").createIndex({ created_at: -1 }),

    // Notifications
    db.collection("notifications").createIndex({ sent_at: -1 }),

    // Upload data collections
    db.collection("fasal_history").createIndex({ prn_no: 1, record_date: -1 }),
    db.collection("map_my_crop").createIndex({ prn_no: 1, record_date: -1 }),
    db.collection("kvk_data").createIndex({ prn_no: 1, record_date: -1 }),
  ]);
}
