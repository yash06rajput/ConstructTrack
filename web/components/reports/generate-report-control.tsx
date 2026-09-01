"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { ReportListItem } from "@/lib/serializers/report";

/**
 * Project picker + "Generate Report" button for the top-level /reports
 * page. The client submits only `projectId` — see lib/validation/report.ts
 * — everything else in the generated report is computed server-side.
 */
export function GenerateReportControl({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!projectId) return;
    setGenerating(true);
    try {
      const report = await apiClient.post<ReportListItem>("/api/reports", { projectId });
      toast.success("Report generated");
      router.push(`/reports/${report.id}`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  }

  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground">Create a project first to generate a report.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={projectId} onValueChange={setProjectId}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleGenerate} disabled={generating || !projectId}>
        {generating ? <Loader2 className="animate-spin" /> : <FileText />}
        Generate Report
      </Button>
    </div>
  );
}
