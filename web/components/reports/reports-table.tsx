import Link from "next/link";
import { Download, Eye, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { ReportListItem } from "@/lib/serializers/report";

/**
 * Report list table (project, generated date, actions). Every report in
 * this system is the same kind ("Progress & Risk Report") and is always
 * fully generated synchronously — there's no pending/failed generation
 * state to track (see docs/reporting.md), so no separate "type"/"status"
 * columns were added to the Report model for this.
 */
export function ReportsTable({ reports, showProject = true }: { reports: ReportListItem[]; showProject?: boolean }) {
  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <FileText className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">No reports generated yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Generate a report to get a structured, printable summary of a project&apos;s progress, AI evidence, and
            schedule risk.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {showProject && <TableHead>Project</TableHead>}
            <TableHead>Report</TableHead>
            <TableHead>Generated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              {showProject && <TableCell>{report.projectName}</TableCell>}
              <TableCell className="max-w-64 truncate">{report.title}</TableCell>
              <TableCell>{formatDateTime(report.generatedAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1.5">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/reports/${report.id}`}>
                      <Eye /> View
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/reports/${report.id}/pdf`}>
                      <Download /> PDF
                    </a>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
