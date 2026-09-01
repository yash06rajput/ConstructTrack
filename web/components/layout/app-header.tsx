"use client";

import { useState } from "react";
import Link from "next/link";
import { HardHat, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function AppHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="no-print sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle asChild>
              <Link
                href="/dashboard"
                className="flex items-center gap-2"
                onClick={() => setMobileNavOpen(false)}
              >
                <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <HardHat className="size-4" />
                </span>
                <span className="text-sm font-semibold">ConstructTrack</span>
              </Link>
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2 md:hidden">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <HardHat className="size-3.5" />
        </span>
        <span className="text-sm font-semibold">ConstructTrack</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex flex-col items-end leading-tight">
          <span className="text-sm font-medium">Project Manager</span>
          <span className="text-xs text-muted-foreground">Demo account</span>
        </div>
        <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
          PM
        </span>
      </div>
    </header>
  );
}
