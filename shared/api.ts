/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Outreach Program Types
 */
export interface OutreachConductedProgram {
  location: string;
  date: string;
  agronomist_specialist: string;
  no_of_people: number;
  duration?: number;
  photos?: File[];
}

export interface OutreachAttendedProgram {
  location: string;
  date: string;
  instructor: string;
  duration?: number;
  photos?: File[];
}

export interface OutreachProgramResponse {
  id: string;
  employee_id: string;
  employee_name?: string;
  section_type: "conducted" | "attended";
  location: string;
  date: string;
  duration?: number;
  photos?: string[];
  agronomist_specialist?: string;
  no_of_people?: number;
  instructor?: string;
  district?: string;
  taluka?: string;
  village?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * S3 Presigned Upload Types
 */
export type S3UploadPurpose =
  | "profile"
  | "outreach"
  | "complaint"
  | "field-visit"
  | "generic";

export interface S3PresignRequest {
  purpose?: S3UploadPurpose;
  contentType: string;
  contentLength?: number;
  fileName?: string;
}

export interface S3PresignResponse {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresInSeconds: number;
}
