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
 * Pages are placeholders in this prompt — full functionality
 * (dashboard widgets, project CRUD, report generation) is built
 * in later prompts.
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
