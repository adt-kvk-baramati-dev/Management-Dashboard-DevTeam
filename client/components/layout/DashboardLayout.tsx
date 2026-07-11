import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { MenuRole } from "@/lib/menuConfig";
import { menuConfig } from "@/lib/menuConfig";
import { useAuth } from "@/lib/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

const DASHBOARD_SCENE_IMAGES = [
  "/image3.png"
];

const getSceneByPath = (pathname: string) => {
  const idx = pathname.length % DASHBOARD_SCENE_IMAGES.length;
  return DASHBOARD_SCENE_IMAGES[idx];
};

export default function DashboardLayout({ children, title = "dashboard" }: DashboardLayoutProps) {
  const location = useLocation();
  const { profile } = useAuth();
  const isMobile = useIsMobile();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role: MenuRole = useMemo(() => {
    if (profile?.role === "employee" || location.pathname.startsWith("/employee")) {
      return "employee";
    }
    return "admin";
  }, [profile?.role, location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) return;
    setMobileOpen(false);
  }, [isMobile]);

  const items = menuConfig[role];

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
      return;
    }

    // On desktop, prevent expanding from the top menu button.
    // Expansion stays controlled by the sidebar bottom arrow.
    if (!collapsed) {
      setCollapsed(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <DashboardSidebar
        items={items}
        pathname={location.pathname}
        collapsed={collapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      <div
        className={cn(
          "min-h-screen transition-[margin] duration-300 ease-in-out",
          collapsed ? "md:ml-[68px]" : "md:ml-[240px]",
        )}
      >
        <DashboardNavbar title={title} role={role} onToggleSidebar={handleToggleSidebar} />
        <main className="bg-background p-4 pb-44 md:p-6 md:pb-44 lg:p-8 lg:pb-44">
          <div className="space-y-6">{children}</div>
        </main>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 opacity-25">
        <img
          src={getSceneByPath(location.pathname)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-36 w-full object-cover object-bottom"
        />
      </div>
    </div>
  );
}
