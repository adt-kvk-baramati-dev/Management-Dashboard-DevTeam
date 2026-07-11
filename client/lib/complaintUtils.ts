import { COMPLAINT_CATEGORIES } from "../../shared/appConstants";

/**
 * Complaint Management Utilities
 * Handles SLA monitoring, status normalization, and red alert detection
 */

export const COMPLAINT_STATUS = {
  PENDING: "Pending",
  SOLVED: "Solved",
  RESOLVED: "Resolved",
  IN_PROGRESS: "In Progress", // Legacy - will be converted to Pending
} as const;

export const RED_ALERT_THRESHOLD = 4; // days

export interface Complaint {
  id: string;
  complaint_id: string;
  prn_no: string;
  farmer_name: string;
  phone: string;
  subject: string;
  complaint: string;
  image: string | null;
  domain: string;
  complaint_type: string;
  district: string;
  taluka: string;
  village: string;
  solve_status: string;
  solved_by: string | null;
  solved_by_name: string | null;
  solved_remark: string | null;
  registered_by: string | null;
  registered_by_name: string;
  assignedEmployees: string[];
  assignedEmployeeNames: string[];
  created_at: Date | string;
  updated_at: Date | string;
  progress?: Array<{ date: Date | string; note: string }>;
  resolution_notes?: string;
}

export { COMPLAINT_CATEGORIES };

export interface ComplaintStats {
  total: number;
  pending: number;
  solved: number;
  redAlert: number;
}

/**
 * Normalize complaint status - converts any status to Pending or Solved
 * @param status - Original status from database
 * @returns Normalized status (Pending or Solved)
 */
export function normalizeComplaintStatus(status: string): "Pending" | "Solved" {
  const normalized = String(status || "").trim().toLowerCase();
  
  if (
    normalized === "solved" ||
    normalized === "resolved" ||
    normalized === "closed"
  ) {
    return "Solved";
  }
  
  // Everything else becomes Pending (including "In Progress")
  return "Pending";
}

/**
 * Calculate days since complaint creation
 * @param complaint - Complaint object or date
 * @returns Number of days elapsed
 */
export function getDaysPending(complaint: Complaint | Date | string): number {
  let createdDate: Date;
  
  if (typeof complaint === "string" || complaint instanceof Date) {
    createdDate = new Date(complaint);
  } else {
    createdDate = new Date(complaint.created_at);
  }
  
  if (isNaN(createdDate.getTime())) {
    return 0;
  }
  
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Check if complaint is a red alert
 * Red alert = not solved AND created more than threshold days ago
 * @param complaint - Complaint object
 * @param threshold - Days threshold (default: 4)
 * @returns true if complaint is red alert
 */
export function isRedAlert(
  complaint: Complaint,
  threshold: number = RED_ALERT_THRESHOLD
): boolean {
  const status = normalizeComplaintStatus(complaint.solve_status);
  const daysPending = getDaysPending(complaint);
  
  return status === "Pending" && daysPending > threshold;
}

/**
 * Filter and sort red alert complaints
 * @param complaints - Array of complaints
 * @param threshold - Days threshold (default: 4)
 * @returns Sorted array of red alert complaints (by days pending descending)
 */
export function getRedAlertComplaints(
  complaints: Complaint[],
  threshold: number = RED_ALERT_THRESHOLD
): Complaint[] {
  return complaints
    .filter((comp) => isRedAlert(comp, threshold))
    .sort((a, b) => getDaysPending(b) - getDaysPending(a));
}

/**
 * Calculate complaint statistics
 * @param complaints - Array of complaints
 * @returns Statistics object with counts
 */
export function calculateComplaintStats(
  complaints: Complaint[],
  threshold: number = RED_ALERT_THRESHOLD
): ComplaintStats {
  let pending = 0;
  let solved = 0;
  let redAlert = 0;
  
  for (const complaint of complaints) {
    const status = normalizeComplaintStatus(complaint.solve_status);
    
    if (status === "Solved") {
      solved++;
    } else {
      pending++;
      if (getDaysPending(complaint) > threshold) {
        redAlert++;
      }
    }
  }
  
  return {
    total: complaints.length,
    pending,
    solved,
    redAlert,
  };
}

/**
 * Get severity level based on days pending
 * @param daysPending - Number of days
 * @returns Severity level
 */
export function getRedAlertSeverity(
  daysPending: number
): "critical" | "warning" | "alert" {
  if (daysPending > 10) return "critical";
  if (daysPending > 7) return "warning";
  return "alert";
}

/**
 * Format complaint status for display with color
 * @param status - Complaint status
 * @returns Display object with label and color class
 */
export function getStatusDisplay(status: string): {
  label: string;
  color: string;
  bgColor: string;
} {
  const normalized = normalizeComplaintStatus(status);
  
  if (normalized === "Solved") {
    return {
      label: "Solved",
      color: "text-emerald-800",
      bgColor: "bg-emerald-100",
    };
  }
  
  return {
    label: "Pending",
    color: "text-amber-800",
    bgColor: "bg-amber-100",
  };
}

/**
 * Memoized complaints grouping by status
 */
export function groupComplaintsByStatus(complaints: Complaint[]): {
  pending: Complaint[];
  solved: Complaint[];
  redAlert: Complaint[];
} {
  const pending: Complaint[] = [];
  const solved: Complaint[] = [];
  const redAlert: Complaint[] = [];
  
  for (const complaint of complaints) {
    const status = normalizeComplaintStatus(complaint.solve_status);
    
    if (status === "Solved") {
      solved.push(complaint);
    } else {
      pending.push(complaint);
      if (isRedAlert(complaint)) {
        redAlert.push(complaint);
      }
    }
  }
  
  return {
    pending: pending.sort((a, b) => getDaysPending(b) - getDaysPending(a)),
    solved: solved.sort((a, b) => getDaysPending(a) - getDaysPending(b)),
    redAlert: redAlert.sort((a, b) => getDaysPending(b) - getDaysPending(a)),
  };
}
