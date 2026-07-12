import type { ObjectId } from "mongodb";
import type { EMPLOYEE_PROFILE_ROLES } from "../../shared/appConstants";

export type S3UploadPurpose = "profile" | "outreach" | "complaint" | "field-visit" | "generic";
export type EmployeeRole = (typeof EMPLOYEE_PROFILE_ROLES)[number];

export type EmployeeDocument = {
  _id?: ObjectId; employee_id?: string; name: string; role: EmployeeRole; email: string;
  profile_photo?: string | null; profile_photo_updated_at?: Date | null;
  domain?: string | null; contact?: string | null; dob?: string | null;
  gender?: string | null; address?: string | null; domain_expertise?: string | null;
  password_hash: string; created_at: Date;
};

export type RegisterDocument = {
  _id?: ObjectId; prn_no: string; farmer_name: string; phone: string; district: string;
  village: string; created_by?: string; name?: string; mobile?: string; role?: string;
  taluka?: string; complaint_type?: string; created_at: Date;
};

export type FarmerResponse = { id: string; prn_no: string; name: string; phone: string; district: string; taluka?: string; village: string; };
export type ComplaintStatus = "Pending" | "Solved" | "In Progress";
export type ComplaintProgress = { date: Date | string; note: string; };
export type ComplaintSource = "call" | "field_visit" | "excel_import";

export type ComplaintDocument = {
  _id?: ObjectId; complaint_id?: string; date?: Date; farmer_name: string; name?: string;
  subject?: string; issue?: string; solve_status?: ComplaintStatus; source?: ComplaintSource;
  registered_by?: string; resolution_notes?: string; prn_no: string; prn?: string;
  complaint_date?: string; sugar_factory_name?: string; mobile?: string; district?: string;
  taluka?: string; village?: string; complaint_type?: string; complaint?: string; image?: string;
  routed_to?: string; auto_classification?: string; assignedEmployees?: string[];
  solved_by?: string | null; solved_by_name?: string | null; solved_remark?: string | null;
  created_at: Date; updated_at?: Date; progress?: ComplaintProgress[];
};

export type EmployeeActivityDocument = {
  _id?: ObjectId; employee_id: string;
  activity_type: "field_visit" | "expert_session" | "seminar" | "sampling" | "OUTREACH_CONDUCTED" | "OUTREACH_ATTENDED";
  date?: Date; location?: string; description?: string; created_at?: Date;
};

export type FarmerVisitDocument = { _id?: ObjectId; prn?: string; visit_date?: string; farmer_name?: string; district?: string; taluka?: string; village?: string; };
export type FasalHistoryDocument = { _id?: ObjectId; prn_no: string; record_date?: Date; created_at?: Date; };
export type KvkDataDocument = { _id?: ObjectId; prn_no: string; record_date?: Date; created_at?: Date; };
export type MapMyCropDocument = { _id?: ObjectId; prn_no: string; record_date?: Date; created_at?: Date; };

export type OutreachProgrammeDocument = {
  _id?: ObjectId; employee_id: string; employee_name?: string; created_by?: string;
  outreach_type: "conducted" | "attended"; section_type?: "conducted" | "attended";
  program_title: string; program_type?: string; organizer?: string; role?: string;
  location: string; date: string; remarks?: string; key_learning?: string; detailed_report?: string;
  supporting_documents?: Array<{ name: string; url: string }>; geo_tagged_photo?: string;
  additional_program_photos?: string[]; certificate?: string;
  geo_latitude?: number | null; geo_longitude?: number | null; geo_location_label?: string;
  created_date?: Date; last_updated?: Date;
  duration?: number; photos?: string[]; agronomist_specialist?: string; no_of_people?: number; instructor?: string;
  district?: string; taluka?: string; village?: string; created_at?: Date; updated_at?: Date;
};

export type MapFeedbackDocument = {
  _id?: ObjectId; employee_id?: string; employee_name?: string; prn?: string; farmer_name?: string;
  mobile?: string; plantation_date?: string; district?: string; taluka?: string; village?: string;
  ndvi_image?: string; ndvi_interpretation?: string; ndvi_feedback?: string;
  evi_image?: string; evi_interpretation?: string; evi_feedback?: string;
  crop_image?: string; crop_interpretation?: string; crop_feedback?: string;
  water_image?: string; water_interpretation?: string; water_feedback?: string;
  growth_image?: string; growth_interpretation?: string; growth_feedback?: string;
  vra_image?: string; vra_interpretation?: string; vra_feedback?: string;
  mmc_image?: string; mmc_interpretation?: string; mmc_feedback?: string;
  fasal_image?: string; fasal_interpretation?: string; fasal_feedback?: string;
  remark?: string; created_at?: Date;
};

export type NotificationDocument = { _id?: ObjectId; message: string; sent_by: string; sent_at: Date; type: string; };

export type FieldVisitDocument = {
  _id?: ObjectId; employee_id?: string; employee_name?: string; prn?: string; visit_date?: string;
  farmer_name?: string; district?: string; taluka?: string; village?: string;
  soil_condition?: string; soil_temp?: string; soil_moisture?: string; irrigation?: string;
  fertilizer?: string; deficiency?: string; pest_attack?: string; disease_symptoms?: string;
  disease_image?: string; krushik?: string; reason?: string; spray?: string; health?: string;
  germination?: string; tillers?: string; height?: string; girth?: string; geo_tag_image?: string;
  observations?: string; remark?: string; created_at?: Date; mobile_no?: string;
  planting_date?: string; harvesting_date?: string; area?: string;
  rainfall_last_week?: string; rainfall_last_week_qty?: string; irrigation_advisories?: string;
  last_irrigation_date?: string; irrigation_advisories_useful?: string; irrigation_advisories_remark?: string;
  irrigation_method?: string; soil_moisture_match?: string; iot_sensor_working?: string;
  fertilizer_advisories?: string; follow_fertilizer_advisory?: string; applied_fertilizer_recently?: string;
  fertilizer_type?: string; fertilizer_quantity?: string; fertilizer_application_date?: string;
  nutrient_deficiency?: string; nutrient_deficiency_type?: string | string[]; nutrient_deficiency_image?: string;
  pest_disease_alerts?: string; pest_disease_observed_name?: string; pest_disease_image?: string;
  pest_disease_alerts_useful?: string; pest_attack_name?: string; pest_attack_image?: string;
  disease_observed?: string; disease_name?: string; last_spray_date?: string; spray_type?: string;
  spray_dosage?: string; spray_challenges?: string; spray_challenges_remark?: string;
  vegetative_maps_displayed?: string; crop_health_maps_match?: string; crop_health_maps_match_remark?: string;
  ai_recommendations_satisfaction?: string;
  point_a_tillers?: string; point_a_height?: string; point_a_girth?: string; point_a_green_leaves?: string;
  point_a_geo_tag_image?: string; point_a_scale_image?: string;
  point_b_tillers?: string; point_b_height?: string; point_b_girth?: string; point_b_green_leaves?: string;
  point_b_geo_tag_image?: string; point_b_scale_image?: string;
  point_c_tillers?: string; point_c_height?: string; point_c_girth?: string; point_c_green_leaves?: string;
  point_c_geo_tag_image?: string; point_c_scale_image?: string;
  crop_health_condition?: string; app_benefits?: string; app_challenges?: string;
  app_suggestions?: string; farmer_observations?: string;
};

export type UserLoginDocument = { _id?: ObjectId; email?: string; created_at?: Date; };
export type UserDocument = { _id?: ObjectId; email?: string; role?: EmployeeRole; };
export type AdminDocument = { _id?: ObjectId; name?: string; email?: string; password?: string; mobile?: string; };
export type LegacyFarmerDocument = { _id?: ObjectId; prn_no: string; name: string; phone: string; district: string; taluka?: string; village: string; created_by: string; created_at: Date; };
export type UploadRecord = Record<string, any>;

export type Collections = {
  admin: AdminDocument;
  complaints: ComplaintDocument;
  employee_activities: EmployeeActivityDocument;
  employees: EmployeeDocument;
  farmer_visits: FarmerVisitDocument;
  field_visits: FieldVisitDocument;
  fasal_history: FasalHistoryDocument;
  kvk_data: KvkDataDocument;
  map_feedback: MapFeedbackDocument;
  map_my_crop: MapMyCropDocument;
  notifications: NotificationDocument;
  outreach_programmes: OutreachProgrammeDocument;
  Farmers: RegisterDocument;
  user_login: UserLoginDocument;
  users: UserDocument;
};

export type CollectionName = keyof Collections;
