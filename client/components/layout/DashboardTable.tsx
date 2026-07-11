import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DashboardTableProps = {
  children: ReactNode;
  className?: string;
};

export default function DashboardTable({ children, className }: DashboardTableProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
        className
      )}
    >
      <div className="custom-scrollbar overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
