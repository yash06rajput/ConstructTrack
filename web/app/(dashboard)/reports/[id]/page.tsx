import { notFound as nextNotFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Download } from "lucide-react";

import { getReportById } from "@/lib/services/reports";
import { toReportDetail } from "@/lib/serializers/report";
import { ApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { ReportView } from "@/components/reports/report-view";
import { PrintButton } from "@/components/reports/print-button";

export const dynamic = "force-dynamic";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: ReportPageProps) {
  const { id } = await params;

  let report;
  try {
    report = await getReportById(id);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      nextNotFound();
    }
    throw error;
  }

  const detail = toReportDetail(report);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/reports"
            className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to reports
          </Link>
          {/* Reports are viewed from a global list, but a report is always
              about one specific project — without this, a user landing
              here has no way back to that project's own page (delay
              prediction, images, progress) short of re-searching for it. */}
          <Link
            href={`/projects/${detail.projectId}`}
            className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Building2 className="size-3.5" />
            View project: {detail.projectName}
          </Link>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <Button variant="outline" asChild>
            <a href={`/api/reports/${detail.id}/pdf`}>
              <Download /> Download PDF
            </a>
          </Button>
        </div>
      </div>

      <ReportView report={detail.data} />
    </div>
  );
}
