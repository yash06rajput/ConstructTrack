import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  FileBarChart,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

/**
 * Primary navigation for the application shell.
 * Each item maps to a fully implemented page: the portfolio
 * dashboard, project management (CRUD, progress, images, analytics,
 * delay prediction) and generated reports.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Project health and progress overview",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: Building2,
    description: "Manage construction projects",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: FileBarChart,
    description: "Generated progress reports",
  },
];
