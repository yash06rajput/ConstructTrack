import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Project not found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This project may have been deleted, or the link is incorrect.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/projects">Back to projects</Link>
      </Button>
    </div>
  );
}
