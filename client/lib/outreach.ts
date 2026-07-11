export type OutreachType = "conducted" | "attended";

export type ConductedProgramType =
  | "Training"
  | "Awareness"
  | "Demonstration"
  | "Workshop"
  | "Field Day";

export type AttendedRole = "Participant" | "Speaker" | "Panelist" | "Guest" | "Expert";

export type OutreachDocument = {
  name: string;
  url: string;
};

export interface OutreachRecord {
  id: string;
  outreach_type: OutreachType;
  section_type?: OutreachType;
  program_title: string;
  program_type?: ConductedProgramType | "";
  organizer?: string;
  role?: AttendedRole | "";
  date: string;
  location: string;
  remarks?: string;
  key_learning?: string;
  detailed_report?: string;
  supporting_documents?: OutreachDocument[];
  geo_tagged_photo?: string;
  additional_program_photos?: string[];
  certificate?: string;
  employee_id: string;
  employee_name: string;
  created_by?: string;
  created_date?: string;
  last_updated?: string;
  geo_latitude?: number | null;
  geo_longitude?: number | null;
  geo_location_label?: string;
}

export const CONDUCTED_PROGRAM_TYPES: ConductedProgramType[] = [
  "Training",
  "Awareness",
  "Demonstration",
  "Workshop",
  "Field Day",
];

export const ATTENDED_ROLES: AttendedRole[] = [
  "Participant",
  "Speaker",
  "Panelist",
  "Guest",
  "Expert",
];

export function getOutreachTypeLabel(outreachType: OutreachType | string) {
  return outreachType === "conducted" ? "Conducted Program" : "Attended Program";
}

export function getOutreachTypeBadgeClass(outreachType: OutreachType | string) {
  return outreachType === "conducted"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-blue-100 text-blue-700";
}

export function getProgramMapUrl(record: Pick<OutreachRecord, "geo_latitude" | "geo_longitude" | "location">) {
  if (typeof record.geo_latitude === "number" && typeof record.geo_longitude === "number") {
    return `https://www.google.com/maps?q=${record.geo_latitude},${record.geo_longitude}`;
  }

  const location = record.location.trim();
  return location ? `https://www.google.com/maps?q=${encodeURIComponent(location)}` : "";
}

export function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function defaultGeoPhotoLabel(index: number) {
  return index === 0 ? "Geo-tagged Photo" : `Additional Photo ${index}`;
}