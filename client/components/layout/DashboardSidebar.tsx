import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sprout, X } from "lucide-react";
import type { MenuItem } from "@/lib/menuConfig";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  items: MenuItem[];
  pathname: string;
  collapsed: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
};

function isRouteActive(pathname: string, item: MenuItem) {
  const routes = item.matchPaths && item.matchPaths.length > 0 ? item.matchPaths : [item.path];
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function SidebarNavItem({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: MenuItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = isRouteActive(pathname, item);

  const content = (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        "group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200",
        collapsed ? "justify-center px-0" : "justify-start",
        active
          ? "bg-gradient-to-r from-emerald-500/90 to-green-600/90 text-white shadow-lg"
          : "text-white/65 hover:bg-white/10 hover:text-white hover:translate-x-1",
      )}
    >
      {/* active left bar */}
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-white/90" />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-all duration-200",
          active ? "text-white" : "text-white/55 group-hover:text-white/90",
        )}
      />
      {!collapsed && (
        <span className={cn("truncate", active ? "font-semibold" : "font-medium")}>
          {item.label}
        </span>
      )}
    </Link>
  );

  if (!collapsed) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarInner({
  items,
  pathname,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  items: MenuItem[];
  pathname: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}) {
  const primaryItems = items.filter((i) => i.group === "primary");
  const secondaryItems = items.filter((i) => i.group === "secondary");

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: "linear-gradient(180deg,#0f3d20 0%,#0b2f18 50%,#081f10 100%)",
      }}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/10 px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <Sprout className="h-4.5 w-4.5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-[15px] font-bold tracking-tight text-white">
                AI ADT Foundation
              </p>
            </div>
          )}
          
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="
              hidden md:flex
              h-8 w-8 items-center justify-center
              rounded-xl
              bg-white/5
              border border-white/10
              text-white/70
              transition-all duration-200
              hover:bg-white/15
              hover:text-white
              hover:scale-105
            "
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="custom-scrollbar flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        <TooltipProvider delayDuration={100}>
          {[...primaryItems, ...secondaryItems].map((item) => (
            <SidebarNavItem
              key={item.path}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </TooltipProvider>
      </nav>

      {!collapsed && (
        <div className="px-3 pb-3">
          <div
            className="
            rounded-2xl
            border border-white/10
            bg-white/5
            p-3
            backdrop-blur-sm
            "
          >
           
          </div>
        </div>
      )}


      {/* Collapse toggle (collapsed state) */}
      {collapsed && (
        <div className="border-t border-white/10 p-2.5">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="
              flex h-10 w-full items-center justify-center
              rounded-xl
              border border-white/10
              bg-white/5
              text-white/70
              transition-all duration-200
              hover:bg-white/15
              hover:text-white
            "
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardSidebar({
  items,
  pathname,
  collapsed,
  isMobile,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: DashboardSidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-white/8 shadow-[4px_0_24px_rgba(0,0,0,0.18)] transition-[width] duration-300 md:block",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        <SidebarInner
          items={items}
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Close sidebar"
          />
          <aside className="relative h-full w-[260px] border-r border-white/10 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
            <button
              type="button"
              onClick={onCloseMobile}
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Close sidebar panel"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarInner
              items={items}
              pathname={pathname}
              collapsed={false}
              onToggleCollapse={onCloseMobile}
              onNavigate={onCloseMobile}
            />
          </aside>
        </div>
      )}
    </>
  );
}
