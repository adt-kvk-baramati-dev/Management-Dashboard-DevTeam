# MongoDB Schema (extracted from server code)

This document summarizes the MongoDB collections, main fields, indexes and relationships inferred from the server code and the collection/index bootstrap.

## Overview
- Database name: configured via `MONGODB_DB_NAME` (default `kvk_portal`).
- Collections created at startup: admin, complaints, employee_activities, employees, farmer_visits, field_visits, fasal_history, kvk_data, map_feedback, map_my_crop, notifications, outreach_programmes, Farmers, user_login, users
- Indexes are created in `server/mongoSchema.ts` at startup.

---

## Collections

### `employees`
- Key fields
  - `_id`: ObjectId
  - `employee_id`: string (E-xxx identifier)
  - `name`: string
  - `role`: "admin" | "employee"
  - `email`: string
  - `password_hash`: string
  - `domain_expertise`, `contact`, `dob`, `gender`, `address`, `profile_photo`, `profile_photo_updated_at`: optional
  - `created_at`: Date
- Indexes
  - `{ email: 1 }` unique
  - `{ role: 1 }`
- Notes
  - Used for authentication; tokens store `userId` as `_id` string.

### `Farmers` (register)
- Key fields
  - `_id`: ObjectId
  - `prn_no`: string (unique PRN for farmer)
  - `farmer_name` / `name`: string
  - `phone` / `mobile`: string
  - `district`, `taluka`, `village`: strings
  - `role`: typically `farmer`
  - `created_by`: string (employee id)
  - `created_at`: Date
- Indexes
  - `{ prn_no: 1 }` unique
  - `{ district: 1 }`
- Notes
  - PRN is normalized and used to join upload tables and generate aggregated views.

### `complaints`
- Key fields
  - `_id`: ObjectId
  - `complaint_id`: string (optional)
  - `farmer_name`, `name`, `subject`, `issue`: strings
  - `solve_status`: "Pending" | "Solved" | "In Progress"
  - `source`: "call" | "field_visit" | "excel_import"
  - `registered_by`, `assigned_to`: string (employee `_id` string or null)
  - `prn_no` / `prn`: string
  - `district`, `taluka`, `village`, `complaint_type`, `complaint`, `image`, `routed_to`, `auto_classification`: optional
  - `created_at`: Date, `updated_at`: Date
  - `progress`: array of `{ date: Date|string, note: string }`
- Indexes
  - `{ prn_no: 1 }`
  - `{ solve_status: 1 }`
  - `{ assigned_to: 1 }`
  - `{ created_at: -1 }`
- Notes
  - `assigned_to` stores the employee `_id` as string; used for per-employee complaint counts.

### `field_visits`
- Key fields
  - `_id`: ObjectId
  - `employee_id`, `employee_name`: string
  - `prn`: string
  - `visit_date`: string (ISO date string)
  - `farmer_name`, `district`, `taluka`, `village` and many observation fields (soil_condition, moisture, pest_attack, images, geo-tag, observations, etc.)
  - `created_at`: Date
- Indexes
  - `{ prn: 1 }`
  - `{ employee_id: 1 }`
  - `{ visit_date: -1 }`

### `map_feedback` (sampling)
- Key fields
  - `_id`: ObjectId
  - `employee_id`, `employee_name`: string
  - `prn`, `farmer_name`, `mobile`
  - many NDVI/EVI/crop/water/growth fields with `_image`, `_interpretation`, `_feedback` suffixes
  - `plantation_date`, `district`, `taluka`, `village`
  - `created_at`: Date
- Indexes
  - `{ prn: 1 }`
  - `{ employee_id: 1 }`
  - `{ plantation_date: -1 }`

### `employee_activities`
- Key fields
  - `_id`: ObjectId
  - `employee_id`: string
  - `activity_type`: "field_visit" | "expert_session" | "seminar" | "sampling"
  - `date`, `location`, `description`, `created_at`
- Indexes
  - `{ employee_id: 1 }`
  - `{ activity_type: 1 }`
  - `{ created_at: -1 }`

### `outreach_programmes`
- Key fields
  - `_id`: ObjectId
  - `employee_id`, `employee_name`: string
  - `section_type`: "conducted" | "attended"
  - `location`, `date`, `duration`, `photos`, `agrnomist_specialist`, `no_of_people`, `instructor`
  - `district`, `taluka`, `village`, `created_at`, `updated_at`
- Indexes
  - `{ employee_id: 1 }`
  - `{ section_type: 1 }`
  - `{ created_at: -1 }`

### `notifications`
- Key fields
  - `_id`: ObjectId
  - `message`: string
  - `sent_by`: string
  - `sent_at`: Date
  - `type`: string
- Indexes
  - `{ sent_at: -1 }`

### Upload / telemetry collections: `fasal_history`, `map_my_crop`, `kvk_data`
- Key fields (each)
  - `_id`: ObjectId
  - `prn_no`: string
  - `record_date`: Date
  - `record_id` / `week` / additional uploaded fields depending on source
  - `farmer_name` or `farm_name` may appear in some upload payloads
  - `created_at`, `updated_at`
- Indexes (bootstrap)
  - `{ prn_no: 1, record_date: -1 }` on each of `fasal_history`, `map_my_crop`, `kvk_data`
- Notes
  - These collections are upserted from bulk uploads and then used to pick the latest record per PRN.

### `farmer_visits`, `user_login`, `users`, `admin`
- Types and fields are lightly used; see `server/index.ts` for `UserDocument`, `UserLoginDocument`, `AdminDocument`, and `FarmerVisitDocument`.

---

## Relationships and usage patterns
- PRN (`prn_no` / `prn`) is the primary domain key used to join farmer-related data across multiple collections (`Farmers`, `map_my_crop`, `fasal_history`, `kvk_data`, `map_feedback`).
- Employees are referenced by `_id` string in several collections (e.g., `complaints.assigned_to`, `employee_activities.employee_id`, `outreach_programmes.employee_id`).
- Upload records use `prn_no` + `record_date` (and sometimes `record_id` or `week`) for deduplication/upserts.
- Timestamps: many collections use `created_at` and `updated_at` for sorting and recency queries.

## Indexes summary
- Unique: `employees.email`, `Farmers.prn_no`
- Common single-field indexes: fields used for filtering/sorting such as `district`, `created_at`, `employee_id`, `assigned_to`, `solve_status`.
- Compound index for time-series-like uploads: `{ prn_no: 1, record_date: -1 }` on `fasal_history`, `map_my_crop`, `kvk_data`.

## Where to look in code
- Collection creation & indexes: [server/mongoSchema.ts](server/mongoSchema.ts)
- Document types, routes and usages: [server/index.ts](server/index.ts)
- Shared API type hints: [shared/api.ts](shared/api.ts)

---

## Recommendations (quick)
- Consider making `complaints.complaint_id` unique or adding a synthetic unique key if external IDs are used.
- Standardize whether employee references store `employee_id` or Mongo `_id` consistently to avoid extra lookups or ambiguous types.
- Consider adding TTL or retention policy for upload/test data if needed.


Generated from code inspection on the repository.
