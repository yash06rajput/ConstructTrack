"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { AnalysisStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnalysisStatusBadge } from "@/components/projects/status-badge";
import { apiClient, ApiClientError } from "@/lib/api/client";
import {
  formatBoundingBox,
  formatConfidencePercent,
  formatDateTime,
  formatDurationMs,
} from "@/lib/format";
import type { ConstructionImageSummary } from "@/lib/serializers/image";
import type { AnalysisSummary, ImageAnalysisStatusResult } from "@/lib/serializers/analysis";

/**
 * Real YOLO11 object-detection results for one image. Every number shown
 * here (confidence, counts, bounding boxes) comes straight from the AI
 * service's response — nothing in this component fabricates a value.
 *
 * Scope note: this only shows object detection. Construction-progress
 * percentage and delay prediction are intentionally NOT part of this UI
 * (see docs/ai-pipeline.md) — a generic pretrained model can't honestly
 * produce them yet.
 */
export function ImageAnalysisPanel({
  image,
  onStatusChange,
}: {
  image: ConstructionImageSummary;
  onStatusChange: (imageId: string, status: AnalysisStatus) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState<AnalysisStatus>(image.analysisStatus);
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .get<ImageAnalysisStatusResult>(`/api/analysis?constructionImageId=${image.id}`)
      .then((result) => {
        if (cancelled) return;
        setStatus(result.analysisStatus);
        setAnalysis(result.analysis);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiClientError ? err.message : "Could not load analysis status.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [image.id]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    setStatus("PROCESSING");
    onStatusChange(image.id, "PROCESSING");

    try {
      const result = await apiClient.post<ImageAnalysisStatusResult>("/api/analysis", {
        constructionImageId: image.id,
      });
      setStatus(result.analysisStatus);
      setAnalysis(result.analysis);
      onStatusChange(image.id, result.analysisStatus);
      if (result.analysisStatus === "COMPLETED") {
        toast.success("AI analysis complete.");
      } else {
        toast.error("AI analysis failed.");
      }
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Analysis failed. Please try again.";
      setError(message);
      setStatus("FAILED");
      onStatusChange(image.id, "FAILED");
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const objectCountEntries = analysis
    ? Object.entries(analysis.objectCounts).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI Analysis</h3>
        <AnalysisStatusBadge status={status} />
      </div>

      {error && status === "FAILED" && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {(status === "PENDING" || status === "FAILED") && !analyzing && (
        <Button type="button" size="sm" onClick={handleAnalyze}>
          <Sparkles /> {status === "FAILED" ? "Retry analysis" : "Analyze with AI"}
        </Button>
      )}

      {(analyzing || status === "PROCESSING") && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Analyzing — running YOLO11 inference, this can take a few seconds…
        </div>
      )}

      {status === "COMPLETED" && analysis && !analyzing && (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Model</dt>
              <dd className="mt-0.5 font-medium">{analysis.modelVersion ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Processed at</dt>
              <dd className="mt-0.5 font-medium">{formatDateTime(analysis.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Processing time</dt>
              <dd className="mt-0.5 font-medium">
                {analysis.processingTimeMs !== null ? formatDurationMs(analysis.processingTimeMs) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Avg. confidence</dt>
              <dd className="mt-0.5 font-medium">
                {analysis.averageConfidence !== null
                  ? formatConfidencePercent(analysis.averageConfidence)
                  : "—"}
              </dd>
            </div>
          </dl>

          <p className="text-sm text-muted-foreground">{analysis.analysisSummary}</p>

          {objectCountEntries.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">Detected objects</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Object</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {objectCountEntries.map(([name, count]) => (
                    <TableRow key={name}>
                      <TableCell className="capitalize">{name}</TableCell>
                      <TableCell className="text-right">{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {analysis.detections.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">Detection details</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Bounding box (x1, y1, x2, y2)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.detections.map((detection, index) => (
                      <TableRow key={`${detection.className}-${index}`}>
                        <TableCell className="capitalize">{detection.className}</TableCell>
                        <TableCell>{formatConfidencePercent(detection.confidence)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatBoundingBox(detection.bbox)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {analysis.annotatedImageUrl && (
            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">AI detection result</h4>
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                <Image
                  src={analysis.annotatedImageUrl}
                  alt="Annotated AI detection result"
                  fill
                  sizes="(min-width: 640px) 768px, 100vw"
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}

          <Button type="button" size="sm" variant="outline" onClick={handleAnalyze}>
            <RefreshCw /> Re-analyze
          </Button>
        </div>
      )}
    </div>
  );
}
