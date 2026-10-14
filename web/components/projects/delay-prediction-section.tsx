"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ChevronDown,
  Info,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildAiEvidenceNote,
  computeDelayPrediction,
  computeDelayPredictionHistory,
  type DelayPredictionFactor,
  type FactorImpact,
  type PredictionRiskLevel,
} from "@/lib/services/delay-prediction";
import { compareDetections, type AnalyzedImageEvidence } from "@/lib/services/ai-evidence";
import { formatDate, formatPercent, formatSignedPercent } from "@/lib/format";
import type { ProgressSnapshot } from "@/lib/serializers/project";
import type { ConstructionImageSummary } from "@/lib/serializers/image";

/**
 * Analytical delay-prediction & schedule-risk section for the project
 * detail page.
 *
 * Everything shown here is computed CLIENT-SIDE, on render, by the same
 * pure, deterministic engine (lib/services/delay-prediction.ts) that
 * GET /api/delay-prediction uses server-side — this mirrors the existing
 * `ProgressKpiCards`/`computeProgressSummary` pattern rather
 * than adding a second network round-trip, and keeps this section in sync
 * automatically with the real `progressRecords`/`images` already rendered
 * on this page. The API route remains the server-authoritative contract
 * (used by anything that isn't this page, e.g. a future report).
 *
 * Academic-integrity boundary: YOLO11 evidence (`aiEvidenceNote`) is a
 * purely factual detection-count comparison and is never an input to the
 * risk score, delay probability, or completion projection above it.
 */
export function DelayPredictionSection({
  project,
  records,
  images,
}: {
  project: { startDate: string; expectedEndDate: string };
  records: ProgressSnapshot[];
  images: ConstructionImageSummary[];
}) {
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const prediction = useMemo(() => {
    const base = computeDelayPrediction(project, records);
    const aiEvidenceNote = buildAiEvidenceNoteFromImages(images);
    return { ...base, aiEvidenceNote };
  }, [project, records, images]);

  const history = useMemo(() => computeDelayPredictionHistory(project, records), [project, records]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Delay Prediction & Schedule Risk</h2>
        <p className="text-sm text-muted-foreground">
          A rule-based schedule projection derived from this project&apos;s own dates and recorded progress —
          not a trained machine-learning forecast.
        </p>
      </div>

      {prediction.status === "INSUFFICIENT_DATA" ? (
        <InsufficientDataCard prediction={prediction} />
      ) : (
        <>
          <DelayKpiCards prediction={prediction} />
          <RiskScoreCard prediction={prediction} />
          <WhyAtRiskCard prediction={prediction} />
          <RequiredVsActualChart prediction={prediction} />
          <CompletionTimeline project={project} prediction={prediction} />
          {history.length > 0 && <PredictionHistoryTable history={history} />}
        </>
      )}

      {prediction.aiEvidenceNote && (
        <Card>
          <CardContent className="flex items-start gap-2.5 py-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>{prediction.aiEvidenceNote}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="cursor-pointer select-none" onClick={() => setMethodologyOpen((open) => !open)}>
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            How is delay predicted?
            <ChevronDown className={`size-4 transition-transform ${methodologyOpen ? "rotate-180" : ""}`} />
          </CardTitle>
        </CardHeader>
        {methodologyOpen && (
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-4">
              <li>
                Every recorded progress update stores a planned percentage and, once observed, an actual
                percentage for a specific date.
              </li>
              <li>
                Schedule variance is the difference between the latest actual and planned percentage
                (<code>actualProgress − plannedProgress</code>).
              </li>
              <li>
                Progress velocity is measured from the REAL elapsed calendar time between the earliest and
                latest updates with a recorded actual value — not an assumed weekly cadence.
              </li>
              <li>
                The remaining work (<code>100% − latest actual</code>) is divided by that velocity to project
                an estimated completion date. If velocity is zero or negative, no completion date is
                projected — the system does not fabricate one.
              </li>
              <li>
                The predicted delay is the difference between the projected completion date and the
                project&apos;s own expected end date, floored at zero for display.
              </li>
              <li>
                A Schedule Risk Score (0–100) and an Estimated Delay Probability (0–100) are each a
                deterministic, documented weighted combination of schedule variance, velocity adequacy,
                predicted schedule delta, and historical trend — the same inputs always produce the same
                score.
              </li>
              <li>
                Data sufficiency (Insufficient / Limited / Adequate / Strong) describes how many actual
                progress updates back the prediction — it is a count of evidence, not a statistical
                confidence percentage.
              </li>
              <li>
                YOLO11 object-detection counts, when available, are shown only as a separate, clearly
                labeled factual note — they are never converted into a progress, completion, or delay claim.
              </li>
            </ol>
            <p className="pt-1">
              This is an analytical schedule-risk model developed for the academic project. It is not a
              statistically validated construction forecasting model.
            </p>
          </CardContent>
        )}
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex items-start gap-2.5 py-4 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-medium text-foreground">Model limitation: </span>
            Delay prediction is based on recorded project progress, schedule dates, and observed historical
            progress velocity. YOLO11 detections are treated only as supporting visual evidence. The current
            system does not use a construction-specific trained machine-learning model and therefore should
            not be interpreted as a production-grade construction forecasting system.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function buildAiEvidenceNoteFromImages(images: ConstructionImageSummary[]): string | null {
  const analyzed = images
    .filter((image) => image.objectCounts !== null)
    .map(
      (image): AnalyzedImageEvidence => ({
        imageId: image.id,
        date: image.uploadedAt,
        originalFilename: image.originalFilename,
        objectCounts: image.objectCounts as Record<string, number>,
      }),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (analyzed.length < 2) return null;
  const earlier = analyzed[0];
  const later = analyzed[analyzed.length - 1];
  return buildAiEvidenceNote(compareDetections(earlier, later), earlier.date, later.date);
}

function InsufficientDataCard({
  prediction,
}: {
  prediction: ReturnType<typeof computeDelayPrediction>;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <ShieldAlert className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Prediction unavailable</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            At least two progress updates with a recorded actual value are required before a schedule risk
            prediction can be computed. {prediction.usableRecordCount} usable update
            {prediction.usableRecordCount === 1 ? "" : "s"} recorded so far.
          </p>
        </div>
        {prediction.latestActualProgress !== null && (
          <div className="mt-2 grid grid-cols-3 gap-4 text-left">
            <div>
              <p className="text-xs text-muted-foreground">Latest actual</p>
              <p className="text-sm font-semibold">{formatPercent(prediction.latestActualProgress)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Latest planned</p>
              <p className="text-sm font-semibold">{formatPercent(prediction.latestPlannedProgress)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current variance</p>
              <p className="text-sm font-semibold">{formatSignedPercent(prediction.currentDeviation)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DelayKpiCards({ prediction }: { prediction: ReturnType<typeof computeDelayPrediction> }) {
  const delayLabel =
    prediction.status === "EARLY"
      ? `${Math.abs(prediction.scheduleDeltaDays ?? 0)}d early`
      : prediction.predictedDelayDays !== null
        ? `${prediction.predictedDelayDays}d`
        : "—";

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard label="Current progress" value={formatPercent(prediction.latestActualProgress)} />
      <KpiCard label="Planned progress" value={formatPercent(prediction.latestPlannedProgress)} />
      <KpiCard
        label="Schedule variance"
        value={formatSignedPercent(prediction.currentDeviation)}
        tone={
          prediction.currentDeviation === null
            ? undefined
            : prediction.currentDeviation > 0
              ? "positive"
              : prediction.currentDeviation < 0
                ? "negative"
                : undefined
        }
      />
      <KpiCard
        label="Predicted completion"
        value={prediction.estimatedCompletionDate ? formatDate(prediction.estimatedCompletionDate) : "Unavailable"}
      />
      <KpiCard
        label={prediction.status === "EARLY" ? "Ahead by" : "Predicted delay"}
        value={delayLabel}
        tone={prediction.status === "DELAYED" ? "negative" : prediction.status === "EARLY" ? "positive" : undefined}
      />
      <KpiCard
        label="Risk score"
        value={prediction.riskScore !== null ? `${prediction.riskScore}/100` : "—"}
        badge={prediction.riskLevel ?? undefined}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
  badge,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  badge?: PredictionRiskLevel;
}) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={`mt-1 text-xl font-semibold ${
            tone === "positive" ? "text-[var(--chart-2)]" : tone === "negative" ? "text-destructive" : ""
          }`}
        >
          {value}
        </p>
        {badge && (
          <Badge variant={riskBadgeVariant(badge)} className="mt-1.5">
            {badge}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Display-only mapping for the engine's PredictionRiskLevel ("MODERATE").
 * Deliberately separate from lib/constants/status.ts's RISK_LEVEL handling
 * (if any is ever added for the Prisma `RiskLevel` enum, which spells its
 * middle band "MEDIUM") — see lib/services/delay-prediction.ts's doc
 * comment on `PredictionRiskLevel`.
 */
export function riskBadgeVariant(level: PredictionRiskLevel): "success" | "warning" | "destructive" {
  if (level === "LOW") return "success";
  if (level === "MODERATE") return "warning";
  return "destructive";
}

const BAR_WIDTH = 24;

function RiskScoreCard({ prediction }: { prediction: ReturnType<typeof computeDelayPrediction> }) {
  const score = prediction.riskScore ?? 0;
  const filled = Math.round((score / 100) * BAR_WIDTH);
  const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Schedule Risk Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm tracking-tight">{bar}</span>
          <span className="text-sm font-semibold">{score}/100</span>
          {prediction.riskLevel && <Badge variant={riskBadgeVariant(prediction.riskLevel)}>{prediction.riskLevel}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          A deterministic, documented heuristic (see &quot;How is delay predicted?&quot; below) — not a
          statistically validated probability.
          {prediction.estimatedDelayProbability !== null && (
            <> Estimated Delay Probability: {prediction.estimatedDelayProbability}%.</>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function impactBadge(impact: FactorImpact): { variant: "success" | "warning" | "destructive" | "outline"; label: string } {
  if (impact === "POSITIVE") return { variant: "success", label: "Positive" };
  if (impact === "NEGATIVE") return { variant: "destructive", label: "Negative" };
  if (impact === "NEUTRAL") return { variant: "warning", label: "Neutral" };
  return { variant: "outline", label: "Unknown" };
}

function FactorRow({ title, factor }: { title: string; factor: DelayPredictionFactor }) {
  const badge = impactBadge(factor.impact);
  return (
    <div className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{factor.explanation}</p>
    </div>
  );
}

function WhyAtRiskCard({ prediction }: { prediction: ReturnType<typeof computeDelayPrediction> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Why is this project at risk?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <FactorRow title="Schedule variance" factor={prediction.factors.scheduleVariance} />
        <FactorRow title="Progress velocity" factor={prediction.factors.progressVelocity} />
        <FactorRow title="Schedule feasibility" factor={prediction.factors.scheduleFeasibility} />
        <FactorRow title="Historical trend" factor={prediction.factors.historicalTrend} />
      </CardContent>
    </Card>
  );
}

function RequiredVsActualChart({ prediction }: { prediction: ReturnType<typeof computeDelayPrediction> }) {
  if (prediction.averageWeeklyProgress === null) return null;

  const requiredWeekly = prediction.requiredDailyProgress !== null ? prediction.requiredDailyProgress * 7 : null;

  const data = [
    {
      name: "Progress velocity (% / week)",
      Actual: prediction.averageWeeklyProgress,
      Required: requiredWeekly ?? 0,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Required vs. actual progress velocity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="Actual" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Required" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {requiredWeekly === null && (
          <p className="mt-2 text-xs text-muted-foreground">
            Required velocity is unavailable — the expected end date has already passed or work is already
            complete.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CompletionTimeline({
  project,
  prediction,
}: {
  project: { startDate: string; expectedEndDate: string };
  prediction: ReturnType<typeof computeDelayPrediction>;
}) {
  const asOf = prediction.asOfDate ?? project.startDate;
  const points = [
    { label: "Latest update", date: asOf },
    { label: "Expected completion", date: prediction.expectedCompletionDate },
    ...(prediction.estimatedCompletionDate
      ? [{ label: "Predicted completion", date: prediction.estimatedCompletionDate }]
      : []),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const times = points.map((point) => new Date(point.date).getTime());
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(1, max - min);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Completion projection timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mt-2 h-1.5 rounded-full bg-muted">
          {points.map((point) => {
            const offset = ((new Date(point.date).getTime() - min) / span) * 100;
            return (
              <div
                key={point.label}
                className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
                style={{ left: `${offset}%` }}
              />
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {points.map((point) => (
            <div key={point.label}>
              <p className="text-xs text-muted-foreground">{point.label}</p>
              <p className="text-sm font-medium">{formatDate(point.date)}</p>
            </div>
          ))}
        </div>
        {!prediction.estimatedCompletionDate && (
          <p className="mt-3 text-xs text-muted-foreground">
            No predicted-completion marker is shown — velocity is currently zero, negative, or otherwise
            insufficient to project a completion date.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PredictionHistoryTable({
  history,
}: {
  history: ReturnType<typeof computeDelayPredictionHistory>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Prediction history</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          How the schedule risk assessment would have looked after each progress update, reconstructed from
          the same real progress records — not a stored/persisted snapshot.
        </p>
        <div className="flex flex-col gap-2">
          {history.map((snapshot) => (
            <div
              key={snapshot.asOfDate}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{formatDate(snapshot.asOfDate)}</span>
              <span className="flex items-center gap-2">
                {snapshot.riskLevel && <Badge variant={riskBadgeVariant(snapshot.riskLevel)}>{snapshot.riskLevel}</Badge>}
                <span className="text-xs text-muted-foreground">
                  {snapshot.riskScore !== null ? `${snapshot.riskScore}/100` : "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {snapshot.predictedDelayDays !== null ? `${snapshot.predictedDelayDays}d delay` : "—"}
                </span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
