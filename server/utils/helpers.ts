import type { CollectionName, Collections, UploadRecord, FieldVisitDocument } from "../types";
import type { MongoClient } from "mongodb";

// ─── Collection helper ────────────────────────────────────────────────────────

export function getCollection<K extends CollectionName>(
  db: ReturnType<MongoClient["db"]>,
  name: K,
) {
  return db.collection<Collections[K]>(name);
}

// ─── PRN / date normalisation ─────────────────────────────────────────────────

export function normalizePrn(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function toDate(value: unknown): Date {
  if (!value) return new Date();
  const dt = new Date(String(value));
  if (Number.isNaN(dt.getTime())) return new Date();
  return dt;
}

export function getRecordDate(record: UploadRecord): Date {
  return toDate(
    record.record_date ?? record.date ?? record.satellite_date ?? record.complaint_date,
  );
}

export function sanitizeUploadDocument(record: Record<string, any>) {
  const clone = { ...record };
  delete clone._id;
  delete clone.created_at;
  return clone;
}

// ─── Bulk write helper ────────────────────────────────────────────────────────

export async function executeBulkUpdates(
  collection: any,
  operations: any[],
  chunkSize = 1000,
): Promise<number> {
  if (operations.length === 0) return 0;
  let changedCount = 0;
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    const result = await collection.bulkWrite(chunk, { ordered: false });
    changedCount += (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
  }
  return changedCount;
}

export function pickLatestByPrn(rows: UploadRecord[]): Map<string, UploadRecord> {
  const map = new Map<string, UploadRecord>();
  for (const row of rows) {
    const prn = normalizePrn(row.prn_no);
    if (!prn) continue;
    const current = map.get(prn);
    if (!current) { map.set(prn, row); continue; }
    const currentDt = toDate(current.record_date ?? current.updated_at ?? current.created_at ?? current.date);
    const rowDt = toDate(row.record_date ?? row.updated_at ?? row.created_at ?? row.date);
    if (rowDt >= currentDt) map.set(prn, row);
  }
  return map;
}

// ─── Complaint helpers ────────────────────────────────────────────────────────

export function normalizeAssignedEmployees(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? "").trim()).filter((entry) => entry.length > 0);
}

export function normalizeComparisonValue(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

// ─── Outreach helpers ─────────────────────────────────────────────────────────

export type OutreachSectionType = "conducted" | "attended";
export type OutreachDocumentAttachment = { name: string; url: string };

export function normalizeOutreachType(value: unknown): OutreachSectionType | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "conducted" || normalized === "attended") return normalized;
  return null;
}

export function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeString(item)).filter((item) => item.length > 0);
}

export function normalizeDocuments(value: unknown): OutreachDocumentAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const url = normalizeString(item);
        if (!url) return null;
        return { name: url.split("/").pop() || "Document", url };
      }
      const url = normalizeString((item as any)?.url ?? (item as any)?.href);
      if (!url) return null;
      return {
        name: normalizeString((item as any)?.name ?? (item as any)?.label) || url.split("/").pop() || "Document",
        url,
      };
    })
    .filter((item): item is OutreachDocumentAttachment => Boolean(item));
}

export function parseGeoNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapOutreachResponse(row: any) {
  const outreachType = normalizeOutreachType(row.outreach_type ?? row.section_type) ?? "conducted";
  const supportingDocuments = normalizeDocuments(row.supporting_documents);
  const legacyPhotos = Array.isArray(row.photos)
    ? row.photos.filter((item: unknown) => Boolean(normalizeString(item)))
    : [];
  const geoTaggedPhoto = normalizeString(row.geo_tagged_photo) || normalizeString(legacyPhotos[0]);

  return {
    id: row._id?.toString() ?? "",
    employee_id: row.employee_id ?? "",
    employee_name: row.employee_name ?? "",
    created_by: row.created_by ?? row.employee_id ?? "",
    outreach_type: outreachType,
    section_type: outreachType,
    program_title: row.program_title ?? row.location ?? "",
    program_type: row.program_type ?? row.agronomist_specialist ?? "",
    organizer: row.organizer ?? row.instructor ?? "",
    role: row.role ?? "",
    date: row.date ?? "",
    location: row.location ?? "",
    remarks: row.remarks ?? "",
    key_learning: row.key_learning ?? "",
    detailed_report: row.detailed_report ?? "",
    supporting_documents: supportingDocuments,
    geo_tagged_photo: geoTaggedPhoto,
    additional_program_photos: normalizeStringArray(row.additional_program_photos).length
      ? normalizeStringArray(row.additional_program_photos)
      : legacyPhotos.slice(1),
    certificate: row.certificate ?? "",
    created_date: row.created_date ?? row.created_at ?? null,
    last_updated: row.last_updated ?? row.updated_at ?? null,
    geo_latitude: parseGeoNumber(row.geo_latitude),
    geo_longitude: parseGeoNumber(row.geo_longitude),
    geo_location_label: row.geo_location_label ?? row.location ?? "",
    district: row.district ?? "",
    taluka: row.taluka ?? "",
    village: row.village ?? "",
    duration: row.duration,
    photos: legacyPhotos,
    agronomist_specialist: row.agronomist_specialist ?? "",
    no_of_people: row.no_of_people,
    instructor: row.instructor ?? "",
  };
}

// ─── Field visit field extraction ─────────────────────────────────────────────

export function extractFieldVisitFields(body: any): Record<string, any> {
  const fields: Record<string, any> = {};

  const setString = (key: keyof FieldVisitDocument, val: any) => {
    if (val !== undefined) {
      (fields as any)[key] = val === null ? "" : String(val).trim();
    }
  };

  const stringFields: Array<keyof FieldVisitDocument> = [
    "prn", "farmer_name", "visit_date", "district", "taluka", "village",
    "soil_condition", "soil_temp", "soil_moisture", "irrigation", "fertilizer",
    "deficiency", "pest_attack", "disease_symptoms", "disease_image", "krushik",
    "reason", "spray", "health", "germination", "tillers", "height", "girth",
    "geo_tag_image", "observations", "remark", "planting_date", "harvesting_date",
    "area", "rainfall_last_week", "rainfall_last_week_qty", "irrigation_advisories",
    "last_irrigation_date", "irrigation_advisories_useful", "irrigation_advisories_remark",
    "irrigation_method", "soil_moisture_match", "iot_sensor_working", "fertilizer_advisories",
    "follow_fertilizer_advisory", "applied_fertilizer_recently", "fertilizer_type",
    "fertilizer_quantity", "fertilizer_application_date", "nutrient_deficiency",
    "nutrient_deficiency_image", "pest_disease_alerts", "pest_disease_observed_name",
    "pest_disease_image", "pest_disease_alerts_useful", "pest_attack_name", "pest_attack_image",
    "disease_observed", "disease_name", "last_spray_date", "spray_type", "spray_dosage",
    "spray_challenges", "spray_challenges_remark", "vegetative_maps_displayed",
    "crop_health_maps_match", "crop_health_maps_match_remark", "ai_recommendations_satisfaction",
    "point_a_tillers", "point_a_height", "point_a_girth", "point_a_green_leaves",
    "point_a_geo_tag_image", "point_a_scale_image",
    "point_b_tillers", "point_b_height", "point_b_girth", "point_b_green_leaves",
    "point_b_geo_tag_image", "point_b_scale_image",
    "point_c_tillers", "point_c_height", "point_c_girth", "point_c_green_leaves",
    "point_c_geo_tag_image", "point_c_scale_image",
    "crop_health_condition", "app_benefits", "app_challenges", "app_suggestions", "farmer_observations",
  ];

  for (const key of stringFields) {
    setString(key, body[key]);
  }

  if (body.nutrient_deficiency_type !== undefined) {
    if (Array.isArray(body.nutrient_deficiency_type)) {
      fields.nutrient_deficiency_type = body.nutrient_deficiency_type;
    } else {
      fields.nutrient_deficiency_type = String(body.nutrient_deficiency_type).trim();
    }
  }

  // Smart sync between legacy and new field names
  if (!fields.point_a_tillers && fields.tillers) fields.point_a_tillers = fields.tillers;
  if (!fields.tillers && fields.point_a_tillers) fields.tillers = fields.point_a_tillers;
  if (!fields.point_a_height && fields.height) fields.point_a_height = fields.height;
  if (!fields.height && fields.point_a_height) fields.height = fields.point_a_height;
  if (!fields.point_a_girth && fields.girth) fields.point_a_girth = fields.girth;
  if (!fields.girth && fields.point_a_girth) fields.girth = fields.point_a_girth;
  if (!fields.point_a_geo_tag_image && fields.geo_tag_image) fields.point_a_geo_tag_image = fields.geo_tag_image;
  if (!fields.geo_tag_image && fields.point_a_geo_tag_image) fields.geo_tag_image = fields.point_a_geo_tag_image;
  if (!fields.disease_image && fields.pest_disease_image) fields.disease_image = fields.pest_disease_image;
  if (!fields.pest_disease_image && fields.disease_image) fields.pest_disease_image = fields.disease_image;

  return fields;
}
