import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  ClipboardList,
  Database,
  FileText,
  FlaskConical,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  Users,
} from "lucide-react";

export type MenuRole = "admin" | "employee";
export type MenuGroup = "primary" | "secondary";

export type MenuItem = {
  path: string;
  matchPaths?: string[];
  label: string;
  icon: LucideIcon;
  group: MenuGroup;
};

export const menuConfig: Record<MenuRole, MenuItem[]> = {
  admin: [
    {
      path: "/admin/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      group: "primary",
    },
    {
      path: "/admin/farmers",
      label: "Farmer Data",
      icon: Database,
      group: "primary",
    },
    {
      path: "/admin/complaints",
      label: "Complaints",
      icon: FileText,
      group: "primary",
    },
    {
      path: "/admin/employees",
      label: "Employee Activities",
      icon: Activity,
      group: "primary",
    },
    {
      path: "/admin/field-visits",
      label: "Field Visits",
      icon: Activity,
      group: "primary",
    },
    {
      path: "/admin/outreach",
      label: "Outreach Sessions",
      icon: Users,
      group: "secondary",
    },
    {
      path: "/admin/sampling",
      label: "Random Sampling",
      icon: MapPin,
      group: "secondary",
    },
  ],
  employee: [
    {
      path: "/employee/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      group: "primary",
    },
    {
      path: "/employee/farmers",
      label: "Farmer DB",
      icon: Database,
      group: "primary",
    },
    {
      path: "/employee/tasks",
      label: "Assigned Tasks",
      icon: ClipboardList,
      group: "primary",
    },
    {
      path: "/employee/complaint-registration",
      label: "Complaints",
      icon: FolderKanban,
      group: "primary",
    },
    {
      path: "/employee/field-visit",
      label: "Field Visits",
      icon: Activity,
      group: "primary",
    },
    {
      path: "/employee/outreach",
      label: "Outreach",
      icon: Users,
      group: "primary",
    },
    {
      path: "/employee/sampling",
      label: "Random Sampling",
      icon: FlaskConical,
      group: "primary",
    },
  ],
};
