"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileBarChart, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportsTable } from "@/components/reports/reports-table";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { ReportListItem } from "@/lib/serializers/report";

/**
 * Project-scoped "Reports" section for the project detail page — replaces
 * the earlier placeholder. Generation needs no manual input beyond the
 * project itself (see lib/services/reports.ts's generateReport()); this
 * component just triggers it and refreshes the list.
 */
export function ReportSection({ projectId, initialReports }: { projectId: string; initialReports: ReportListItem[] }) {
  const router = useRouter();
  const [reports, setReports] = useState(initialReports);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const report = await apiClient.post<ReportListItem>("/api/reports", { projectId });
      setReports((prev) => [report, ...prev]);
      toast.success("Report generated");
      router.push(`/reports/${report.id}`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileBarChart className="size-4" />
          Reports
        </CardTitle>
        <Button size="sm" onClick={handleGenerate} disabled={generating}>
          {generating && <Loader2 className="animate-spin" />}
          Generate Report
        </Button>
      </CardHeader>
      <CardContent>
        <ReportsTable reports={reports} showProject={false} />
      </CardContent>
    </Card>
  );
}
