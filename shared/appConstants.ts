export const AUTH_ROLES = ["admin", "employee"] as const;

export const STANDARDIZED_WORK_ROLES = [
  "SF Coordination",
  "Krushik Advisory",
  "Sensor Data (Fasal)",
  "Map My Crop",
  "Fertilizer Scheduling",
  "Pest and Disease",
  "Soil Testing Report",
  "Field Visit",
] as const;

export const COMPLAINT_CATEGORIES = STANDARDIZED_WORK_ROLES;

export const EMPLOYEE_PROFILE_ROLES = [...AUTH_ROLES, ...STANDARDIZED_WORK_ROLES] as const;
