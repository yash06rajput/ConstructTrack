"use client";

import { Images, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ImageCard } from "@/components/construction-images/image-card";
import type { ConstructionImageSummary } from "@/lib/serializers/image";

export function ImageGallery({
  images,
  onView,
  onDelete,
  onUploadClick,
}: {
  images: ConstructionImageSummary[];
  onView: (image: ConstructionImageSummary) => void;
  onDelete: (image: ConstructionImageSummary) => void;
  onUploadClick: () => void;
}) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Images className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">No construction images yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Upload site images to begin monitoring project progress.
          </p>
        </div>
        <Button type="button" onClick={onUploadClick} size="sm">
          <Upload /> Upload images
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          onView={() => onView(image)}
          onDelete={() => onDelete(image)}
        />
      ))}
    </div>
  );
}
