import { notFound as nextNotFound } from "next/navigation";

import { getProjectOrThrow } from "@/lib/services/projects";
import { listImages } from "@/lib/services/images";
import { listReports } from "@/lib/services/reports";
import { toProjectDetailData } from "@/lib/serializers/project";
import { toImageSummary } from "@/lib/serializers/image";
import { toReportListItem } from "@/lib/serializers/report";
import { ApiError } from "@/lib/api/errors";
import { ProjectDetailHeader } from "@/components/projects/project-detail-header";
import { ProjectOverviewCards } from "@/components/projects/project-overview-cards";
import { ProjectInfoCard } from "@/components/projects/project-info-card";
import { ProgressMonitoringSection } from "@/components/projects/progress-monitoring-section";
import { ReportSection } from "@/components/projects/report-section";
import { ConstructionImageSection } from "@/components/construction-images/construction-image-section";
import { ImageTimeline } from "@/components/construction-images/image-timeline";
import { ImageComparison } from "@/components/construction-images/image-comparison";
import { AiDetectionTrends } from "@/components/construction-images/ai-detection-trends";
import { DelayPredictionSection } from "@/components/projects/delay-prediction-section";

export const dynamic = "force-dynamic";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;

  let project;
  try {
    project = await getProjectOrThrow(id);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      nextNotFound();
    }
    throw error;
  }

  const data = toProjectDetailData(project);
  const images = await listImages(id);
  const imageSummaries = images.map(toImageSummary);
  const reports = await listReports(id);
  const reportSummaries = reports.map(toReportListItem);

  return (
    <div className="flex flex-col gap-6">
      <ProjectDetailHeader project={data} />
      <ProjectOverviewCards project={data} />
      <ProjectInfoCard project={data} />
      <ProgressMonitoringSection projectId={data.id} initialRecords={data.progressRecords} />

      <ImageTimeline images={imageSummaries} />

      <ImageComparison images={imageSummaries} />

      <AiDetectionTrends images={imageSummaries} />

      <DelayPredictionSection
        project={{ startDate: data.startDate, expectedEndDate: data.expectedEndDate }}
        records={data.progressRecords}
        images={imageSummaries}
      />

      <ConstructionImageSection
        projectId={data.id}
        projectName={data.name}
        initialImages={imageSummaries}
        progressRecords={data.progressRecords}
      />

      <ReportSection projectId={data.id} initialReports={reportSummaries} />
    </div>
  );
}
