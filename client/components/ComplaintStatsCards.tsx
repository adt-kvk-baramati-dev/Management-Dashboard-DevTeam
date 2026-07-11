import React from "react";
import { AlertTriangle, CheckCircle2, ListTodo, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ComplaintStats } from "@/lib/complaintUtils";

interface ComplaintStatsCardsProps {
  stats: ComplaintStats;
  onFilterClick?: (filter: "all" | "pending" | "solved" | "red-alert") => void;
  isLoading?: boolean;
}

/**
 * Complaint Statistics Cards Component
 * Displays KPI cards for complaint dashboard
 */
export const ComplaintStatsCards: React.FC<ComplaintStatsCardsProps> = ({
  stats,
  onFilterClick,
  isLoading = false,
}) => {
  const cards = [
    {
      id: "total",
      label: "Total Complaints",
      value: stats.total,
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-900",
      onClick: () => onFilterClick?.("all"),
    },
    {
      id: "pending",
      label: "Pending",
      value: stats.pending,
      icon: ListTodo,
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50",
      textColor: "text-amber-900",
      onClick: () => onFilterClick?.("pending"),
    },
    {
      id: "solved",
      label: "Solved",
      value: stats.solved,
      icon: CheckCircle2,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-900",
      onClick: () => onFilterClick?.("solved"),
    },
    {
      id: "red-alert",
      label: "Red Alert",
      value: stats.redAlert,
      icon: AlertTriangle,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50",
      textColor: "text-red-900",
      onClick: () => onFilterClick?.("red-alert"),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        
        return (
          <button
            key={card.id}
            onClick={card.onClick}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-outline-variant/30 p-5",
              "transition-all duration-300 hover:shadow-lg",
              isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-outline-variant/50",
              card.bgColor
            )}
            disabled={isLoading}
          >
            {/* Background gradient accent */}
            <div
              className={cn(
                "absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-xl",
                `bg-gradient-to-r ${card.color}`,
                "group-hover:scale-110 transition-transform duration-300"
              )}
            />

            {/* Content */}
            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <p className={cn("text-sm font-medium opacity-75 mb-2", card.textColor)}>
                  {card.label}
                </p>
                <p className={cn("text-4xl font-bold", card.textColor)}>
                  {isLoading ? "—" : stats[card.id as keyof ComplaintStats]}
                </p>
              </div>

              {/* Icon */}
              <div
                className={cn(
                  "rounded-xl p-3 opacity-80 group-hover:opacity-100 transition-opacity",
                  `bg-gradient-to-br ${card.color}`,
                  "text-white"
                )}
              >
                <Icon className="w-6 h-6" />
              </div>
            </div>

            {/* Top border accent */}
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-0.5 transform scale-x-0",
                `bg-gradient-to-r ${card.color}`,
                "group-hover:scale-x-100 transition-transform duration-500 origin-left"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

export default ComplaintStatsCards;
