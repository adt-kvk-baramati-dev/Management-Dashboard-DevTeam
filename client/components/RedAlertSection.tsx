import React from "react";
import { AlertTriangle, Clock, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDaysPending, getRedAlertSeverity, type Complaint } from "@/lib/complaintUtils";

interface RedAlertSectionProps {
  complaints: Complaint[];
  onSelectComplaint?: (complaint: Complaint) => void;
  isLoading?: boolean;
}

/**
 * Red Alert Section Component
 * Displays critical overdue complaints in prominent alert section
 */
export const RedAlertSection: React.FC<RedAlertSectionProps> = ({
  complaints,
  onSelectComplaint,
  isLoading = false,
}) => {
  if (complaints.length === 0 || isLoading) {
    return null;
  }

  const severityColor = {
    critical: {
      bg: "bg-red-50",
      border: "border-red-300",
      iconBg: "bg-red-100",
      icon: "text-red-600",
      badge: "bg-red-600",
    },
    warning: {
      bg: "bg-orange-50",
      border: "border-orange-300",
      iconBg: "bg-orange-100",
      icon: "text-orange-600",
      badge: "bg-orange-600",
    },
    alert: {
      bg: "bg-yellow-50",
      border: "border-yellow-300",
      iconBg: "bg-yellow-100",
      icon: "text-yellow-600",
      badge: "bg-yellow-600",
    },
  };

  return (
    <div className="mb-8 rounded-2xl border-2 border-red-300 bg-red-50 p-6 shadow-md">
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-lg bg-red-100 p-2">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-red-900">
            🚨 Critical Alert - SLA Breached
          </h2>
          <p className="text-sm text-red-700">
            {complaints.length} complaint{complaints.length !== 1 ? "s" : ""} exceeded{" "}
            4-day resolution window
          </p>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {complaints.map((complaint) => {
          const daysPending = getDaysPending(complaint);
          const severity = getRedAlertSeverity(daysPending);
          const colors = severityColor[severity];

          return (
            <button
              key={complaint.id}
              onClick={() => onSelectComplaint?.(complaint)}
              className={cn(
                "group cursor-pointer rounded-xl border-2 p-4 transition-all",
                "hover:shadow-lg hover:translate-y-[-2px]",
                colors.bg,
                colors.border
              )}
            >
              {/* Top Section */}
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    ID
                  </p>
                  <p className="font-bold text-red-900">{complaint.complaint_id}</p>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-1 text-sm font-bold text-white",
                    colors.badge
                  )}
                >
                  <Clock className="h-4 w-4" />
                  <span>{daysPending} d</span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="space-y-2 text-sm">
                {/* Farmer */}
                <div className="flex items-center gap-2">
                  <User className={cn("h-4 w-4 flex-shrink-0", colors.icon)} />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-red-600 uppercase">Farmer</p>
                    <p className="truncate font-medium text-red-900">
                      {complaint.farmer_name}
                    </p>
                  </div>
                </div>

                {/* PRN */}
                <div className="flex items-center gap-2">
                  <MapPin className={cn("h-4 w-4 flex-shrink-0", colors.icon)} />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-red-600 uppercase">PRN</p>
                    <p className="truncate font-medium text-red-900">{complaint.prn_no}</p>
                  </div>
                </div>

                {/* Domain & Assignee */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase">Domain</p>
                    <p className="truncate font-medium text-red-900">{complaint.domain}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase">Assigned</p>
                    <p className="truncate font-medium text-red-900">
                      {(complaint.assignedEmployeeNames || []).join(", ") || "Unassigned"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hover hint */}
              <div className="mt-3 border-t border-red-200 pt-2">
                <p className="text-xs font-medium text-red-700 group-hover:text-red-900">
                  Click to view details →
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="border-t border-red-200 pt-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-red-600">Total Overdue</p>
            <p className="text-2xl font-bold text-red-900">{complaints.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-red-600">Most Overdue</p>
            <p className="text-2xl font-bold text-red-900">
              {Math.max(...complaints.map((c) => getDaysPending(c)))} days
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-red-600">Avg Wait</p>
            <p className="text-2xl font-bold text-red-900">
              {Math.round(
                complaints.reduce((acc, c) => acc + getDaysPending(c), 0) /
                  complaints.length
              )}{" "}
              days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedAlertSection;
