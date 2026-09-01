"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisStatusBadge } from "@/components/projects/status-badge";
import { formatDate } from "@/lib/format";
import type { ConstructionImageSummary } from "@/lib/serializers/image";

/**
 * Chronological (oldest first) visual timeline of every uploaded image,
 * regardless of AI-analysis status — a PENDING/FAILED image still shows up
 * with an honest status badge rather than being hidden (see requirement
 * #17, "AI analysis completeness").
 */
export function ImageTimeline({ images }: { images: ConstructionImageSummary[] }) {
  if (images.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Construction image timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            No construction images yet. Upload site images to begin visual monitoring.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...images].sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Construction image timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-6 border-l pl-6">
          {sorted.map((image) => {
            const totalDetections = image.objectCounts
              ? Object.values(image.objectCounts).reduce((sum, count) => sum + count, 0)
              : null;

            return (
              <li key={image.id} className="relative">
                <span className="absolute -left-[29px] top-1 flex size-3 items-center justify-center rounded-full border-2 border-background bg-primary" />
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {formatDate(image.uploadedAt)}
                </p>
                <div className="mt-2 flex items-start gap-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {image.imageUrl ? (
                      <Image
                        src={image.imageUrl}
                        alt={image.originalFilename}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageOff className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="truncate text-sm font-medium" title={image.originalFilename}>
                      {image.originalFilename}
                    </p>
                    <div className="flex items-center gap-2">
                      <AnalysisStatusBadge status={image.analysisStatus} />
                      {totalDetections !== null && (
                        <span className="text-xs text-muted-foreground">
                          {totalDetections} object{totalDetections === 1 ? "" : "s"} detected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
