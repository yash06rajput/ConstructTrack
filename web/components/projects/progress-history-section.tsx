"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProgressStatusBadge } from "@/components/projects/status-badge";
import { formatDate, formatPercent, formatSignedPercent } from "@/lib/format";
import type { ProgressSnapshot } from "@/lib/serializers/project";

export function ProgressHistorySection({
  records,
  onAdd,
  onEdit,
  onDelete,
}: {
  records: ProgressSnapshot[];
  onAdd: () => void;
  onEdit: (record: ProgressSnapshot) => void;
  onDelete: (record: ProgressSnapshot) => void;
}) {
  if (records.length === 0) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Progress history</CardTitle>
          <Button type="button" size="sm" onClick={onAdd}>
            <Plus /> Add progress update
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <LineChartIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No progress updates yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Add the first progress update to start tracking planned vs. actual performance.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={onAdd}>
              <Plus /> Add progress update
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = records.map((record) => ({
    date: formatDate(record.recordDate),
    Planned: record.plannedProgress,
    Actual: record.actualProgress,
  }));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Planned vs. actual progress</CardTitle>
        <Button type="button" size="sm" onClick={onAdd}>
          <Plus /> Add progress update
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value) =>
                  typeof value === "number" ? `${value}%` : String(value ?? "")
                }
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="Planned"
                stroke="var(--chart-5)"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Actual"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Progress history</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Planned</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Deviation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...records].reverse().map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.recordDate)}</TableCell>
                    <TableCell>{formatPercent(record.plannedProgress)}</TableCell>
                    <TableCell>{formatPercent(record.actualProgress)}</TableCell>
                    <TableCell>{formatSignedPercent(record.deviation)}</TableCell>
                    <TableCell>
                      {record.status ? (
                        <ProgressStatusBadge status={record.status} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Row actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onEdit(record)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => onDelete(record)}
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
