import { AlertTriangle, ImageOff, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnalysisStatusBadge, ProgressStatusBadge } from "@/components/projects/status-badge";
import { riskBadgeVariant } from "@/lib/constants/risk";
import { ReportProgressChart } from "@/components/reports/report-progress-chart";
import { REPORT_DISCLAIMER_POINTS, REPORT_METHODOLOGY_SECTIONS } from "@/lib/reports/formatting";
import { formatDate, formatDateTime, formatPercent, formatSignedPercent } from "@/lib/format";
import type { ReportData } from "@/lib/reports/types";

const BAR_WIDTH = 24;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="print-avoid-break">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

/**
 * Renders a complete ReportData snapshot as a professional web report.
 * Server-renderable (no client interactivity needed except the Recharts
 * chart, which is its own small client component) — used by both the
 * report preview page and, via the browser's print dialog, PDF-adjacent
 * printing. The PDF export itself (lib/reports/pdf.ts) is a separate,
 * text/table-first renderer sharing the same methodology/disclaimer
 * content so the two never say different things.
 */
export function ReportView({ report }: { report: ReportData }) {
  const { header, executiveSummary, projectOverview, progressAnalytics, imageSummary, aiAnalysis, delayPrediction } = report;

  return (
    <div className="flex flex-col gap-4">
      {/* Report header */}
      <Card className="print-avoid-break">
        <CardContent className="space-y-2 py-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{header.reportTitle}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{header.projectName}</h1>
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            <Field label="Location" value={header.projectLocation ?? "Not specified"} />
            <Field
              label="Reporting Period"
              value={`${formatDate(header.reportingPeriodStart)} – ${formatDate(header.reportingPeriodEnd)}`}
            />
            <Field label="Generated" value={formatDateTime(header.generatedAt)} />
            <Field label="Project Status" value={<Badge variant="outline">{header.projectStatus}</Badge>} />
          </div>
          <p className="pt-1 text-xs text-muted-foreground">
            Project dates: {formatDate(header.projectStartDate)} – {formatDate(header.expectedEndDate)}
          </p>
        </CardContent>
      </Card>

      {/* Executive summary */}
      <SectionCard title="Executive Summary">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Recorded Progress" value={formatPercent(executiveSummary.recordedProgress)} />
          <Field label="Planned Progress" value={formatPercent(executiveSummary.plannedProgress)} />
          <Field label="Variance" value={formatSignedPercent(executiveSummary.variance)} />
          <Field label="Schedule Status" value={executiveSummary.scheduleStatusLabel ?? "Insufficient data"} />
          <Field
            label="Progress Trend"
            value={
              executiveSummary.trendAvailable
                ? `${formatSignedPercent(executiveSummary.averageGainPerWeek)} / week`
                : `Insufficient data`
            }
          />
        </div>
        {executiveSummary.prediction.status === "INSUFFICIENT_DATA" ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Predicted completion, delay, and risk: <span className="font-medium">Insufficient data</span> — at least two
            progress updates with a recorded actual value are required.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field
              label="Predicted Completion"
              value={executiveSummary.prediction.estimatedCompletionDate ? formatDate(executiveSummary.prediction.estimatedCompletionDate) : "Unavailable"}
            />
            <Field label="Expected Completion" value={formatDate(executiveSummary.prediction.expectedCompletionDate)} />
            <Field
              label="Predicted Delay"
              value={
                executiveSummary.prediction.predictedDelayDays !== null
                  ? `${executiveSummary.prediction.predictedDelayDays} days`
                  : "Unavailable"
              }
            />
            <Field
              label="Risk Score"
              value={
                executiveSummary.prediction.riskScore !== null ? (
                  <span className="flex items-center gap-1.5">
                    {executiveSummary.prediction.riskScore}/100
                    {executiveSummary.prediction.riskLevel && (
                      <Badge variant={riskBadgeVariant(executiveSummary.prediction.riskLevel)}>
                        {executiveSummary.prediction.riskLevel}
                      </Badge>
                    )}
                  </span>
                ) : (
                  "Unavailable"
                )
              }
            />
          </div>
        )}
      </SectionCard>

      {/* Project overview */}
      <SectionCard title="Project Overview">
        <p className="text-sm text-muted-foreground">{projectOverview.description ?? "No description provided."}</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Location" value={projectOverview.location ?? "Not specified"} />
          <Field label="Start Date" value={formatDate(projectOverview.startDate)} />
          <Field label="Expected End Date" value={formatDate(projectOverview.expectedEndDate)} />
          <Field label="Status" value={<Badge variant="outline">{projectOverview.status}</Badge>} />
          <Field label="Progress Records" value={String(projectOverview.progressRecordCount)} />
          <Field label="Construction Images" value={String(projectOverview.imageCount)} />
          <Field label="Analyzed Images" value={String(projectOverview.analyzedImageCount)} />
          <Field
            label="Latest Progress Record"
            value={projectOverview.latestProgressRecordDate ? formatDate(projectOverview.latestProgressRecordDate) : "None recorded"}
          />
        </div>
      </SectionCard>

      {/* Progress analytics */}
      <SectionCard title="Progress Analytics">
        {!progressAnalytics.current.hasData ? (
          <p className="text-sm text-muted-foreground">No progress records have been recorded for this project.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Latest Actual" value={formatPercent(progressAnalytics.current.currentActual)} />
            <Field label="Latest Planned" value={formatPercent(progressAnalytics.current.currentPlanned)} />
            <Field
              label="Deviation"
              value={progressAnalytics.current.varianceAvailable ? formatSignedPercent(progressAnalytics.current.variance) : "Not yet recorded"}
            />
            <Field
              label="Status"
              value={
                progressAnalytics.current.status ? <ProgressStatusBadge status={progressAnalytics.current.status} /> : "Not available"
              }
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field
            label="Progress Change"
            value={progressAnalytics.current.trend.available ? formatSignedPercent(progressAnalytics.current.trend.progressChange) : "Insufficient data"}
          />
          <Field
            label="Avg. Gain / Week"
            value={progressAnalytics.current.trend.available ? formatSignedPercent(progressAnalytics.current.trend.averageGainPerWeek) : "Insufficient data"}
          />
          <Field label="Data Sufficiency" value={delayPrediction.dataSufficiency} />
        </div>
        {!progressAnalytics.current.trend.available && progressAnalytics.current.hasData && (
          <p className="text-xs text-muted-foreground">
            Historical trend unavailable — {progressAnalytics.current.trend.reason}
          </p>
        )}
      </SectionCard>

      {/* Historical progress table + chart */}
      <SectionCard title="Historical Progress">
        {progressAnalytics.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No progress records have been recorded for this project.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Planned</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progressAnalytics.history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.recordDate)}</TableCell>
                    <TableCell>{formatPercent(record.plannedProgress)}</TableCell>
                    <TableCell>{formatPercent(record.actualProgress)}</TableCell>
                    <TableCell>{record.deviation !== null ? formatSignedPercent(record.deviation) : "—"}</TableCell>
                    <TableCell>{record.status ? <ProgressStatusBadge status={record.status} /> : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <ReportProgressChart history={progressAnalytics.history} />

      {/* Construction images */}
      <SectionCard title="Construction Image Summary">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Total Images" value={String(imageSummary.totalImages)} />
          <Field label="Analyzed" value={String(imageSummary.analyzedImages)} />
          <Field label="Pending" value={String(imageSummary.pendingImages)} />
          <Field label="Failed" value={String(imageSummary.failedImages)} />
        </div>
        {imageSummary.timeline.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
            <ImageOff className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No construction images have been uploaded for this project.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detections</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imageSummary.timeline.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.uploadedAt)}</TableCell>
                    <TableCell className="max-w-48 truncate">{entry.originalFilename}</TableCell>
                    <TableCell>
                      <AnalysisStatusBadge status={entry.analysisStatus} />
                    </TableCell>
                    <TableCell>{entry.totalDetections !== null ? entry.totalDetections : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          AI object detections provide visual evidence only and do not directly represent construction completion
          percentage.
        </p>
      </SectionCard>

      {/* AI computer-vision analysis */}
      <SectionCard title="AI Computer-Vision Analysis">
        {!aiAnalysis.available ? (
          <p className="text-sm text-muted-foreground">AI analysis unavailable — no construction images have completed AI analysis.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Model" value={aiAnalysis.modelVersion ?? "Unknown"} />
              <Field label="Analyzed Images" value={String(aiAnalysis.analyzedImageCount)} />
              <Field label="Total Detections" value={aiAnalysis.totalDetections !== null ? String(aiAnalysis.totalDetections) : "—"} />
              <Field
                label="Average Confidence"
                value={aiAnalysis.averageConfidence !== null ? `${(aiAnalysis.averageConfidence * 100).toFixed(1)}%` : "Data unavailable"}
              />
              <Field label="Unique Classes" value={String(aiAnalysis.uniqueClasses.length)} />
            </div>
            {aiAnalysis.objectCounts.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Object Class</TableHead>
                      <TableHead>Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiAnalysis.objectCounts.map((row) => (
                      <TableRow key={row.className}>
                        <TableCell className="capitalize">{row.className}</TableCell>
                        <TableCell>{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {aiAnalysis.comparison && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Detection Comparison ({formatDate(aiAnalysis.comparison.earlierDate)} → {formatDate(aiAnalysis.comparison.laterDate)}
                  , {aiAnalysis.comparison.daysBetween} days)
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Object</TableHead>
                        <TableHead>Earlier</TableHead>
                        <TableHead>Later</TableHead>
                        <TableHead>Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiAnalysis.comparison.rows.map((row) => (
                        <TableRow key={row.className}>
                          <TableCell className="capitalize">{row.className}</TableCell>
                          <TableCell>{row.earlier}</TableCell>
                          <TableCell>{row.later}</TableCell>
                          <TableCell>{row.change > 0 ? `+${row.change}` : row.change}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Detections shown above are visual AI evidence, not a construction-progress measurement.
            </p>
          </>
        )}
      </SectionCard>

      {/* Delay prediction */}
      <SectionCard title="Delay Prediction">
        {delayPrediction.status === "INSUFFICIENT_DATA" ? (
          <p className="text-sm text-muted-foreground">
            Insufficient data — {delayPrediction.usableRecordCount} usable progress update
            {delayPrediction.usableRecordCount === 1 ? "" : "s"} recorded. At least two are required.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Prediction Status" value={delayPrediction.status} />
            <Field
              label="Estimated Completion Date"
              value={delayPrediction.estimatedCompletionDate ? formatDate(delayPrediction.estimatedCompletionDate) : "Unavailable"}
            />
            <Field label="Expected Completion Date" value={formatDate(delayPrediction.expectedCompletionDate)} />
            <Field
              label="Predicted Delay Days"
              value={delayPrediction.predictedDelayDays !== null ? String(delayPrediction.predictedDelayDays) : "Unavailable"}
            />
            <Field
              label="Average Daily Progress"
              value={delayPrediction.averageDailyProgress !== null ? `${delayPrediction.averageDailyProgress}%/day` : "Unavailable"}
            />
            <Field
              label="Average Weekly Progress"
              value={delayPrediction.averageWeeklyProgress !== null ? `${delayPrediction.averageWeeklyProgress}%/week` : "Unavailable"}
            />
            <Field
              label="Required Daily Progress"
              value={delayPrediction.requiredDailyProgress !== null ? `${delayPrediction.requiredDailyProgress}%/day` : "Unavailable"}
            />
            <Field label="Velocity Ratio" value={delayPrediction.velocityRatio !== null ? String(delayPrediction.velocityRatio) : "Unavailable"} />
          </div>
        )}
        <Field label="Data Sufficiency" value={delayPrediction.dataSufficiency} />
      </SectionCard>

      {/* Risk analysis */}
      <SectionCard title="Risk Analysis">
        {delayPrediction.riskScore === null || delayPrediction.riskLevel === null ? (
          <p className="text-sm text-muted-foreground">Risk score unavailable — insufficient historical progress data.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm tracking-tight">
                {"█".repeat(Math.round((delayPrediction.riskScore / 100) * BAR_WIDTH))}
                {"░".repeat(BAR_WIDTH - Math.round((delayPrediction.riskScore / 100) * BAR_WIDTH))}
              </span>
              <span className="text-lg font-semibold">{delayPrediction.riskScore} / 100</span>
              <Badge variant={riskBadgeVariant(delayPrediction.riskLevel)}>{delayPrediction.riskLevel}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated Delay Probability:{" "}
              {delayPrediction.estimatedDelayProbability !== null ? `${delayPrediction.estimatedDelayProbability}%` : "Unavailable"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["Schedule Variance", delayPrediction.factors.scheduleVariance],
                  ["Progress Velocity", delayPrediction.factors.progressVelocity],
                  ["Schedule Feasibility", delayPrediction.factors.scheduleFeasibility],
                  ["Historical Trend", delayPrediction.factors.historicalTrend],
                ] as const
              ).map(([label, factor]) => (
                <div key={label} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{factor.explanation}</p>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Estimated Delay Probability is a deterministic heuristic indicator based on the project&apos;s available
          schedule variance, velocity, and historical trend. It is not a statistically validated probability model.
        </p>
      </SectionCard>

      {/* Methodology */}
      <SectionCard title="Methodology">
        {REPORT_METHODOLOGY_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-sm font-medium">{section.title}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </SectionCard>

      {/* Limitations / disclaimer */}
      <Card className="print-avoid-break border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" />
            Limitations & Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-xs text-muted-foreground">
            {REPORT_DISCLAIMER_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
