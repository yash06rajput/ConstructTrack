"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import type { AnalysisStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageGallery } from "@/components/construction-images/image-gallery";
import { ImageUploadDialog } from "@/components/construction-images/image-upload-dialog";
import { ImageViewerDialog } from "@/components/construction-images/image-viewer-dialog";
import { DeleteImageDialog } from "@/components/construction-images/delete-image-dialog";
import type { ConstructionImageSummary } from "@/lib/serializers/image";

export function ConstructionImageSection({
  projectId,
  projectName,
  initialImages,
}: {
  projectId: string;
  projectName: string;
  initialImages: ConstructionImageSummary[];
}) {
  const [images, setImages] = useState(initialImages);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<ConstructionImageSummary | null>(null);
  const [deletingImage, setDeletingImage] = useState<ConstructionImageSummary | null>(null);

  function handleUploaded(uploaded: ConstructionImageSummary[]) {
    setImages((prev) => [...uploaded, ...prev]);
  }

  function handleDeleted(imageId: string) {
    setImages((prev) => prev.filter((image) => image.id !== imageId));
  }

  function handleAnalysisStatusChange(imageId: string, status: AnalysisStatus) {
    setImages((prev) =>
      prev.map((image) => (image.id === imageId ? { ...image, analysisStatus: status } : image)),
    );
    setViewingImage((prev) => (prev && prev.id === imageId ? { ...prev, analysisStatus: status } : prev));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Construction images</CardTitle>
          <p className="mt-1 text-sm font-normal text-muted-foreground">
            Upload periodic site images to monitor project progress.
          </p>
        </div>
        {images.length > 0 && (
          <Button type="button" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload /> Upload images
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ImageGallery
          images={images}
          onView={setViewingImage}
          onDelete={setDeletingImage}
          onUploadClick={() => setUploadOpen(true)}
        />
      </CardContent>

      <ImageUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={projectId}
        onUploaded={handleUploaded}
      />

      <ImageViewerDialog
        image={viewingImage}
        projectName={projectName}
        onOpenChange={(open) => !open && setViewingImage(null)}
        onStatusChange={handleAnalysisStatusChange}
      />

      {deletingImage && (
        <DeleteImageDialog
          open={deletingImage !== null}
          onOpenChange={(open) => !open && setDeletingImage(null)}
          imageId={deletingImage.id}
          filename={deletingImage.originalFilename}
          onDeleted={handleDeleted}
        />
      )}
    </Card>
  );
}
