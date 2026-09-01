"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AlertTriangle, ImageOff } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnalysisStatusBadge } from "@/components/projects/status-badge";
import { BeforeAfterSlider } from "@/components/construction-images/before-after-slider";
import { compareDetections, daysBetween } from "@/lib/services/ai-evidence";
import { formatDate } from "@/lib/format";
import type { ConstructionImageSummary } from "@/lib/serializers/image";

export function ImageComparison({ images }: { images: ConstructionImageSummary[] }) {
  const sorted = useMemo(
    () => [...images].sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()),
    [images],
  );

  const [earlierId, setEarlierId] = useState<string | undefined>(sorted[0]?.id);
  const [laterId, setLaterId] = useState<string | undefined>(sorted[sorted.length - 1]?.id);

  if (images.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Before / after comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            {images.length === 0
              ? "No construction images yet. Upload site images to begin visual monitoring."
              : "At least two construction images are required to compare progress visually."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const earlier = sorted.find((image) => image.id === earlierId) ?? sorted[0];
  const later = sorted.find((image) => image.id === laterId) ?? sorted[sorted.length - 1];
  const bothCompleted = earlier.objectCounts !== null && later.objectCounts !== null;
  const comparison =
    bothCompleted && earlier.objectCounts && later.objectCounts
      ? compareDetections(
          { imageId: earlier.id, date: earlier.uploadedAt, originalFilename: earlier.originalFilename, objectCounts: earlier.objectCounts },
          { imageId: later.id, date: later.uploadedAt, originalFilename: later.originalFilename, objectCounts: later.objectCounts },
        )
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Before / after comparison</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Earlier image</Label>
            <Select value={earlierId} onValueChange={setEarlierId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an image" />
              </SelectTrigger>
              <SelectContent>
                {sorted.map((image) => (
                  <SelectItem key={image.id} value={image.id}>
                    {formatDate(image.uploadedAt)} — {image.originalFilename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Later image</Label>
            <Select value={laterId} onValueChange={setLaterId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an image" />
              </SelectTrigger>
              <SelectContent>
                {sorted.map((image) => (
                  <SelectItem key={image.id} value={image.id}>
                    {formatDate(image.uploadedAt)} — {image.originalFilename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {earlier.id === later.id ? (
          <p className="text-sm text-muted-foreground">Select two different images to compare.</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Earlier date</dt>
                <dd className="mt-0.5 font-medium">{formatDate(earlier.uploadedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Later date</dt>
                <dd className="mt-0.5 font-medium">{formatDate(later.uploadedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Days between</dt>
                <dd className="mt-0.5 font-medium">
                  {Math.abs(daysBetween(earlier.uploadedAt, later.uploadedAt))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">AI analysis</dt>
                <dd className="mt-0.5 flex gap-1">
                  <AnalysisStatusBadge status={earlier.analysisStatus} />
                  <AnalysisStatusBadge status={later.analysisStatus} />
                </dd>
              </div>
            </dl>

            {new Date(earlier.uploadedAt) > new Date(later.uploadedAt) ? (
              <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                <p>
                  The &quot;earlier&quot; image was actually uploaded after the &quot;later&quot;
                  one — swap the selections for a chronological before/after view.
                </p>
              </div>
            ) : (
              <BeforeAfterSlider
                beforeUrl={earlier.imageUrl}
                beforeLabel={`Earlier — ${formatDate(earlier.uploadedAt)}`}
                afterUrl={later.imageUrl}
                afterLabel={`Later — ${formatDate(later.uploadedAt)}`}
              />
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[{ label: "Earlier", image: earlier }, { label: "Later", image: later }].map(
                ({ label, image }) => (
                  <div key={image.id} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {label} — {formatDate(image.uploadedAt)}
                    </p>
                    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                      {image.imageUrl ? (
                        <Image
                          src={image.imageUrl}
                          alt={`${label} — ${image.originalFilename}`}
                          fill
                          sizes="(min-width: 640px) 384px, 100vw"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageOff className="size-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium">AI visual evidence</h4>
              {comparison ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Object</TableHead>
                          <TableHead className="text-right">Earlier</TableHead>
                          <TableHead className="text-right">Later</TableHead>
                          <TableHead className="text-right">Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.rows.map((row) => (
                          <TableRow key={row.className}>
                            <TableCell className="capitalize">{row.className}</TableCell>
                            <TableCell className="text-right">{row.earlier}</TableCell>
                            <TableCell className="text-right">{row.later}</TableCell>
                            <TableCell className="text-right">
                              {row.change > 0 ? `+${row.change}` : row.change}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    AI detections are supporting visual evidence — a real, factual count of
                    objects the model recognized in each photo. They are not construction
                    completion percentages; the authoritative progress figures come from the
                    project&apos;s recorded progress updates above.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  AI trend unavailable — both images need a completed AI analysis to compare
                  detections. Open an image and select &quot;Analyze with AI&quot; first.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
