import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderSection({
  icon: Icon,
  title,
  description,
  note,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  note: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{description}</p>
            <p className="max-w-sm text-xs text-muted-foreground">{note}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
