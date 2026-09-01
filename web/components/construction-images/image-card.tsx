"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AnalysisStatusBadge } from "@/components/projects/status-badge";
import { formatDate } from "@/lib/format";
import type { ConstructionImageSummary } from "@/lib/serializers/image";

export function ImageCard({
  image,
  onView,
  onDelete,
}: {
  image: ConstructionImageSummary;
  onView: () => void;
  onDelete: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <Card className="overflow-hidden py-0">
      <button
        type="button"
        onClick={onView}
        className="relative block aspect-video w-full bg-muted"
        aria-label={`View ${image.originalFilename}`}
      >
        {!imageError ? (
          <Image
            src={image.imageUrl}
            alt={image.originalFilename}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 100vw"
            className="object-cover"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Image unavailable
          </div>
        )}
      </button>

      <CardContent className="flex flex-col gap-1 pt-4">
        <p className="truncate text-sm font-medium" title={image.originalFilename}>
          {image.originalFilename}
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(image.uploadedAt)}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">AI Analysis</span>
          <AnalysisStatusBadge status={image.analysisStatus} />
        </div>
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2 border-t py-3">
        <Button type="button" variant="outline" size="sm" onClick={onView}>
          <Eye /> View
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
