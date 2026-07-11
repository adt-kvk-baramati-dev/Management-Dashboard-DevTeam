import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
  active?: boolean;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex flex-wrap items-center gap-1 text-xs", className)} aria-label="Geography breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={item.label + index}>
            <button
              type="button"
              onClick={item.onClick}
              disabled={isLast || !item.onClick}
              className={cn(
                "rounded-lg px-2 py-1 transition-colors",
                isLast || item.active
                  ? "bg-primary/10 text-primary font-semibold cursor-default"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
              )}
            >
              {item.label}
            </button>
            {!isLast ? (
              <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant/70" aria-hidden="true" />
            ) : null}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
