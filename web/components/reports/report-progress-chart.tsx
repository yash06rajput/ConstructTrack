"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { ProgressSnapshot } from "@/lib/serializers/project";

/**
 * Planned-vs-actual line chart for the report's Progress Analytics
 * section. Only ever plots real recorded points — a record without an
 * actualProgress value simply leaves a gap in the "Actual" line rather
 * than interpolating or fabricating one.
 */
export function ReportProgressChart({ history }: { history: ProgressSnapshot[] }) {
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Planned vs. Actual Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No progress records have been recorded for this project.</p>
        </CardContent>
      </Card>
    );
  }

  const data = history.map((record) => ({
    date: formatDate(record.recordDate),
    Planned: record.plannedProgress,
    Actual: record.actualProgress,
  }));

  return (
    <Card className="print-avoid-break">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Planned vs. Actual Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="Planned" stroke="var(--chart-3)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Actual" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
