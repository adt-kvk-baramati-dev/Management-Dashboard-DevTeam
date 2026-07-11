import React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RedAlertBadgeProps {
  count: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  onClick?: () => void;
}

/**
 * Red Alert Badge Component
 * Displays count of red alert complaints with visual prominence
 */
export const RedAlertBadge: React.FC<RedAlertBadgeProps> = ({
  count,
  size = "md",
  showIcon = true,
  onClick,
}) => {
  if (count === 0) {
    return null;
  }

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold transition-all duration-200",
        "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg",
        "animate-pulse hover:animate-none",
        sizeClasses[size]
      )}
      aria-label={`${count} red alert complaints`}
    >
      {showIcon && <AlertTriangle className="w-4 h-4" />}
      <span>{count}</span>
    </button>
  );
};

export default RedAlertBadge;
