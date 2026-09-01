"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ScanSearch } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildObjectCountHistory, listAvailableObjectClasses } from "@/lib/services/ai-evidence";
import { formatDate } from "@/lib/format";
import type { ConstructionImageSummary } from "@/lib/serializers/image";

const TOTAL_DETECTIONS = "__total__";

/**
 * Historical chart of REAL YOLO11 object-detection counts across a
 * project's analyzed images. This is "detected activity" evidence, not a
 * construction-progress or completion metric — see docs/ai-pipeline.md and
 * docs/progress-monitoring.md for why a generic pretrained model can't
 * support that claim.
 */
export function AiDetectionTrends({ images }: { images: ConstructionImageSummary[] }) {
  const evidence = useMemo(
    () =>
      images
        .filter((image) => image.objectCounts !== null)
        .map((image) => ({
          imageId: image.id,
          date: image.uploadedAt,
          originalFilename: image.originalFilename,
          objectCounts: image.objectCounts as Record<string, number>,
        })),
    [images],
  );

  const history = useMemo(() => buildObjectCountHistory(evidence), [evidence]);
  const availableClasses = useMemo(() => listAvailableObjectClasses(evidence), [evidence]);

  const [selectedClass, setSelectedClass] = useState<string>(TOTAL_DETECTIONS);

  if (evidence.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI detection trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
            <ScanSearch className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No completed AI analyses yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Analyze construction images to generate visual detection insights.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = history.map((point) => ({
    date: formatDate(point.date),
    value:
      selectedClass === TOTAL_DETECTIONS
        ? point.totalDetections
        : (point.objectCounts[selectedClass] ?? 0),
  }));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">AI detection trends</CardTitle>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOTAL_DETECTIONS}>All objects</SelectItem>
            {availableClasses.map((className) => (
              <SelectItem key={className} value={className} className="capitalize">
                {className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [
                  `${value} detection${value === 1 ? "" : "s"}`,
                  selectedClass === TOTAL_DETECTIONS ? "Total" : selectedClass,
                ]}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Detected activity from real YOLO11 inference on analyzed images — supporting visual
          evidence, not a construction completion percentage.
        </p>
      </CardContent>
    </Card>
  );
}
