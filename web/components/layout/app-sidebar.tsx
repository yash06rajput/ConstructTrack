import Link from "next/link";
import { HardHat } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";

export function AppSidebar() {
  return (
    <aside className="no-print hidden md:flex md:w-64 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardHat className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            ConstructTrack
          </span>
        </Link>
      </div>
      <SidebarNav />
      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          AI Construction Progress Monitoring
        </p>
      </div>
    </aside>
  );
}
