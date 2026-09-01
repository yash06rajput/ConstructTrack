import type { RiskLevel } from "@prisma/client";

/**
 * Transparent, rule-based delay-prediction baseline.
 *
 * Methodology (see docs/delay-prediction.md for the full write-up):
 *   1. deviation = actualProgress - plannedProgress (already stored on ProgressRecord)
 *   2. Express that deviation as a fraction of the project's total planned
 *      duration to get an estimated schedule slip in calendar days.
 *   3. Classify risk purely from the magnitude of the deviation.
 *
 * No arbitrary/hard-coded delay values are used — everything is derived
 * from the project's own dates and the recorded deviation. This baseline is
 * intentionally simple and explainable; it is the foundation a future ML
 * model (trained on historical ProgressRecord + DelayPrediction data) can
 * replace or augment without changing the surrounding architecture.
 */

export const RISK_THRESHOLDS = {
  low: -3, // deviation >= -3 -> LOW
  medium: -10, // -10 <= deviation < -3 -> MEDIUM
  high: -20, // -20 <= deviation < -10 -> HIGH
  // deviation < -20 -> CRITICAL
} as const;

export function classifyRisk(deviation: number): RiskLevel {
  if (deviation >= RISK_THRESHOLDS.low) return "LOW";
  if (deviation >= RISK_THRESHOLDS.medium) return "MEDIUM";
  if (deviation >= RISK_THRESHOLDS.high) return "HIGH";
  return "CRITICAL";
}

export interface DelayEstimateInput {
  deviation: number;
  projectStartDate: Date;
  projectExpectedEndDate: Date;
}

export interface DelayEstimateResult {
  estimatedDelayDays: number;
  riskLevel: RiskLevel;
  explanation: string;
  methodology: string;
}

export function estimateDelay({
  deviation,
  projectStartDate,
  projectExpectedEndDate,
}: DelayEstimateInput): DelayEstimateResult {
  const totalPlannedDays = Math.max(
    1,
    Math.round(
      (projectExpectedEndDate.getTime() - projectStartDate.getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  // A negative deviation (behind schedule) maps to a positive delay estimate.
  const rawDelayDays = (-deviation / 100) * totalPlannedDays;
  const estimatedDelayDays = Math.max(0, Math.round(rawDelayDays));
  const riskLevel = classifyRisk(deviation);

  const explanation =
    deviation >= 0
      ? `Actual progress is ${deviation.toFixed(1)} points ahead of plan; no schedule delay is projected.`
      : `Actual progress is ${Math.abs(deviation).toFixed(1)} points behind plan. Projected against the ` +
        `project's ${totalPlannedDays}-day planned duration, this corresponds to an estimated ` +
        `${estimatedDelayDays}-day schedule slip if the trend continues.`;

  return {
    estimatedDelayDays,
    riskLevel,
    explanation,
    methodology: "deviation-proportional-baseline-v1",
  };
}


// ============================================================================
// Prompt 6 — Analytical delay-prediction & schedule-risk engine
// ============================================================================
//
// Everything below is a NEW, project-level analytical layer that sits
// alongside (and does not replace) the Prompt 1 baseline above. The
// baseline (`estimateDelay`/`classifyRisk`) is a single-record, deviation-
// proportional estimate and is still used by `lib/services/delay.service.ts`
// (POST /api/delay) and `prisma/seed.ts` — it is left untouched for
// backward compatibility and regression safety.
//
// This engine instead answers "given everything we know about this
// project's schedule and recorded progress, when will it realistically
// finish, and how risky is that?" using REAL elapsed calendar time and a
// documented, deterministic, weighted scoring formula. It is pure (no
// Prisma/Next.js/React imports), so it can be unit-tested directly and
// reused from both the API route and, if ever needed, a Server Component.
//
// Academic-integrity boundary (see docs/ai-pipeline.md,
// docs/progress-monitoring.md): YOLO11 detections are NEVER used as an
// input to any formula below. The only place AI evidence appears is the
// optional, clearly-labeled `aiEvidenceNote` (built by
// `buildAiEvidenceNote`), which is a factual detection-count comparison,
// never a progress/delay claim.
//
// Determinism: nothing here reads the wall clock. Every value is derived
// only from the `project` and `records` arguments passed in, so the same
// input always produces the same `DelayPredictionResult` (see
// lib/services/delay-prediction.test.ts's "determinism" tests).

import { computeDeviation } from "@/lib/services/progress";
import { computeProgressTrend, type ProgressRecordLike } from "@/lib/services/progress-analytics";
import { daysBetween as isoDaysBetween, type DetectionComparison } from "@/lib/services/ai-evidence";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * How much historical evidence backs a prediction. This is explicitly NOT
 * a statistical confidence figure (never expressed as e.g. "94.7%") — it
 * is a plain description of how many actual-progress data points exist.
 */
export type DataSufficiency = "INSUFFICIENT" | "LIMITED" | "ADEQUATE" | "STRONG";

/** Top-level prediction outcome, including the explicit "can't predict yet" state. */
export type SchedulePredictionStatus = "INSUFFICIENT_DATA" | "EARLY" | "ON_TRACK" | "DELAYED";

/**
 * Display-level risk band. Deliberately spelled "MODERATE" (matching this
 * prompt's UI contract) rather than the Prisma `RiskLevel` enum's "MEDIUM"
 * — this engine's result is not persisted through that model (see the
 * persistence-decision note in docs/delay-prediction.md), so there is no
 * enum collision to reconcile.
 */
export type PredictionRiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type FactorImpact = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "UNKNOWN";

export interface DelayPredictionFactor {
  value: number | string | null;
  impact: FactorImpact;
  explanation: string;
}

export interface DelayPredictionResult {
  /** INSUFFICIENT_DATA when fewer than 2 actual-bearing progress records exist. */
  status: SchedulePredictionStatus;
  dataSufficiency: DataSufficiency;
  /** Count of progress records that carry a recorded `actualProgress`. */
  usableRecordCount: number;
  /** ISO date of the most recent actual-bearing progress record used, or null if none. */
  asOfDate: string | null;

  latestActualProgress: number | null;
  latestPlannedProgress: number | null;
  /** actualProgress - plannedProgress on the latest actual-bearing record (reuses computeDeviation()). */
  currentDeviation: number | null;

  /** (latestActual - earliestActual) / elapsedDays, over REAL elapsed calendar time. */
  averageDailyProgress: number | null;
  /** averageDailyProgress * 7 — reuses lib/services/progress-analytics.ts's computeProgressTrend(). */
  averageWeeklyProgress: number | null;
  /** remainingProgress / daysRemaining-until-expectedEndDate. Null if the expected end date has passed or is today. */
  requiredDailyProgress: number | null;
  /** averageDailyProgress / requiredDailyProgress. Null when either side is unavailable or not meaningful. */
  velocityRatio: number | null;

  /** Projected completion date at the current velocity. Null when velocity is zero/negative/unknown (never fabricated). */
  estimatedCompletionDate: string | null;
  /** The project's own Project.expectedEndDate, always known. */
  expectedCompletionDate: string;
  /** estimatedCompletionDate - expectedCompletionDate, in days. Negative = early, 0 = on time, positive = late. */
  scheduleDeltaDays: number | null;
  /** max(0, scheduleDeltaDays) — always >= 0 so the UI never has to render a confusing negative "delay". */
  predictedDelayDays: number | null;

  /** 0-100. NOT a validated statistical probability — a documented deterministic heuristic. See "Schedule Risk Score" vs "Estimated Delay Probability" in docs/delay-prediction.md. */
  riskScore: number | null;
  riskLevel: PredictionRiskLevel | null;
  /** 0-100. Labeled "Estimated Delay Probability" everywhere in the UI — never presented as a measured probability. */
  estimatedDelayProbability: number | null;

  factors: {
    scheduleVariance: DelayPredictionFactor;
    progressVelocity: DelayPredictionFactor;
    scheduleFeasibility: DelayPredictionFactor;
    historicalTrend: DelayPredictionFactor;
  };

  /** Optional, secondary-only factual YOLO11 detection-count comparison. Never an input to any score above. */
  aiEvidenceNote: string | null;

  /** Human-readable description of exactly which rule produced this result, for the methodology drawer. */
  methodology: string;
}

export interface DelayPredictionProjectInput {
  startDate: Date | string;
  expectedEndDate: Date | string;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function daysBetweenDates(earlier: Date, later: Date): number {
  return isoDaysBetween(earlier.toISOString(), later.toISOString());
}

export function computeDataSufficiency(usableRecordCount: number): DataSufficiency {
  if (usableRecordCount <= 1) return "INSUFFICIENT";
  if (usableRecordCount === 2) return "LIMITED";
  if (usableRecordCount <= 4) return "ADEQUATE";
  return "STRONG";
}

export function classifyPredictionRiskLevel(riskScore: number): PredictionRiskLevel {
  if (riskScore < 25) return "LOW";
  if (riskScore < 50) return "MODERATE";
  if (riskScore < 75) return "HIGH";
  return "CRITICAL";
}

/** Factor 1 — schedule-variance score (0 = no concern, 100 = severe). */
function varianceFactorScore(deviation: number | null): number {
  if (deviation === null) return 50;
  if (deviation >= 0) return 10;
  if (deviation >= -5) return 40;
  if (deviation >= -15) return 65;
  return 90;
}

interface VelocityScoreInput {
  remainingProgress: number;
  averageDailyProgress: number | null;
  requiredDailyProgress: number | null;
  velocityRatio: number | null;
}

/** Factor 2 — velocity-adequacy score (0 = comfortably on pace, 100 = severe concern). */
function velocityFactorScore({
  remainingProgress,
  averageDailyProgress,
  requiredDailyProgress,
  velocityRatio,
}: VelocityScoreInput): number {
  if (remainingProgress <= 0) return 10; // Target already reached.
  if (averageDailyProgress === null) return 50; // Genuinely unknown (zero elapsed time between records).
  if (averageDailyProgress <= 0) return 90; // Stalled or regressing with work still remaining.
  if (requiredDailyProgress === null) return 90; // Expected end date already passed with work remaining.
  if (velocityRatio === null) return 50;
  if (velocityRatio >= 1.0) return 10;
  if (velocityRatio >= 0.8) return 35;
  if (velocityRatio >= 0.5) return 65;
  return 90;
}

interface TrendScoreResult {
  score: number;
  direction: "IMPROVING" | "WORSENING" | "STABLE" | "UNKNOWN";
  windowSize: number;
}

/**
 * Factor 3 (delay probability) / Factor 4 (risk score) — historical trend.
 * Reuses `computeDeviation()` per record; needs at least 3 actual-bearing
 * records to distinguish a genuine trend from a single-step comparison
 * (which `scheduleVariance` already covers).
 */
function trendFactorScore(
  actualBearing: { recordDate: Date | string; plannedProgress: number; actualProgress: number }[],
): TrendScoreResult {
  if (actualBearing.length < 3) {
    return { score: 50, direction: "UNKNOWN", windowSize: actualBearing.length };
  }
  const window = actualBearing.slice(-3);
  const deviations = window.map((record) => computeDeviation(record.plannedProgress, record.actualProgress) ?? 0);
  const delta = round(deviations[deviations.length - 1] - deviations[0], 2);
  if (delta > 1) return { score: 20, direction: "IMPROVING", windowSize: window.length };
  if (delta < -1) return { score: 80, direction: "WORSENING", windowSize: window.length };
  return { score: 50, direction: "STABLE", windowSize: window.length };
}

interface ScheduleDeltaScoreInput {
  predictedDelayDays: number | null;
  averageDailyProgress: number | null;
  remainingProgress: number;
  totalPlannedDays: number;
}

/** Used only in the risk-score formula (not the delay-probability formula). */
function scheduleDeltaFactorScore({
  predictedDelayDays,
  averageDailyProgress,
  remainingProgress,
  totalPlannedDays,
}: ScheduleDeltaScoreInput): number {
  if (remainingProgress <= 0) return 10;
  if (predictedDelayDays === null) {
    return averageDailyProgress !== null && averageDailyProgress <= 0 ? 100 : 60;
  }
  if (predictedDelayDays <= 0) return 5;
  const ratio = predictedDelayDays / Math.max(1, totalPlannedDays);
  return Math.min(100, Math.round((ratio / 0.3) * 100));
}

function unknownFactor(explanation: string): DelayPredictionFactor {
  return { value: null, impact: "UNKNOWN", explanation };
}

const INSUFFICIENT_DATA_METHODOLOGY =
  "Insufficient data: at least two progress updates with a recorded actual value are required " +
  "before a velocity, completion date, or risk score can be computed. See docs/delay-prediction.md.";

/**
 * The main entry point. Deterministic and pure: the same `project` and
 * `records` always produce the same `DelayPredictionResult`. Pass
 * `options.asOfDate` to compute what the prediction would have looked like
 * using only records up to (and including) that date — this is how
 * `computeDelayPredictionHistory()` reconstructs prediction snapshots over
 * time without any additional persistence.
 */
export function computeDelayPrediction(
  project: DelayPredictionProjectInput,
  records: ProgressRecordLike[],
  options?: { asOfDate?: Date | string },
): DelayPredictionResult {
  const expectedEndDate = toDate(project.expectedEndDate);
  const startDate = toDate(project.startDate);
  const cutoff = options?.asOfDate ? toDate(options.asOfDate) : null;

  const scoped = cutoff ? records.filter((record) => toDate(record.recordDate).getTime() <= cutoff.getTime()) : records;

  const actualBearing = scoped
    .filter(
      (record): record is ProgressRecordLike & { actualProgress: number } =>
        record.actualProgress !== null && record.actualProgress !== undefined,
    )
    .sort((a, b) => toDate(a.recordDate).getTime() - toDate(b.recordDate).getTime());

  const usableRecordCount = actualBearing.length;
  const dataSufficiency = computeDataSufficiency(usableRecordCount);
  const expectedCompletionDate = expectedEndDate.toISOString();

  if (usableRecordCount === 0) {
    return {
      status: "INSUFFICIENT_DATA",
      dataSufficiency,
      usableRecordCount,
      asOfDate: null,
      latestActualProgress: null,
      latestPlannedProgress: null,
      currentDeviation: null,
      averageDailyProgress: null,
      averageWeeklyProgress: null,
      requiredDailyProgress: null,
      velocityRatio: null,
      estimatedCompletionDate: null,
      expectedCompletionDate,
      scheduleDeltaDays: null,
      predictedDelayDays: null,
      riskScore: null,
      riskLevel: null,
      estimatedDelayProbability: null,
      factors: {
        scheduleVariance: unknownFactor("No progress updates with a recorded actual value exist yet."),
        progressVelocity: unknownFactor("No progress updates with a recorded actual value exist yet."),
        scheduleFeasibility: unknownFactor("No progress updates with a recorded actual value exist yet."),
        historicalTrend: unknownFactor("No progress updates with a recorded actual value exist yet."),
      },
      aiEvidenceNote: null,
      methodology: INSUFFICIENT_DATA_METHODOLOGY,
    };
  }

  const latest = actualBearing[actualBearing.length - 1];
  const latestActualProgress = latest.actualProgress;
  const latestPlannedProgress = latest.plannedProgress;
  const currentDeviation = computeDeviation(latestPlannedProgress, latestActualProgress);
  const latestDate = toDate(latest.recordDate);
  const asOfDate = latestDate.toISOString();

  const scheduleVarianceFactor: DelayPredictionFactor =
    currentDeviation === null
      ? unknownFactor("Actual progress has not been recorded for the latest update.")
      : {
          value: currentDeviation,
          impact: currentDeviation > 0 ? "POSITIVE" : currentDeviation < 0 ? "NEGATIVE" : "NEUTRAL",
          explanation:
            currentDeviation >= 0
              ? `Actual progress (${latestActualProgress}%) is ${round(Math.abs(currentDeviation), 1)} points at or ahead of the planned ${latestPlannedProgress}% as of the latest update.`
              : `Actual progress (${latestActualProgress}%) is ${round(Math.abs(currentDeviation), 1)} points behind the planned ${latestPlannedProgress}% as of the latest update.`,
        };

  if (usableRecordCount < 2) {
    return {
      status: "INSUFFICIENT_DATA",
      dataSufficiency,
      usableRecordCount,
      asOfDate,
      latestActualProgress,
      latestPlannedProgress,
      currentDeviation,
      averageDailyProgress: null,
      averageWeeklyProgress: null,
      requiredDailyProgress: null,
      velocityRatio: null,
      estimatedCompletionDate: null,
      expectedCompletionDate,
      scheduleDeltaDays: null,
      predictedDelayDays: null,
      riskScore: null,
      riskLevel: null,
      estimatedDelayProbability: null,
      factors: {
        scheduleVariance: scheduleVarianceFactor,
        progressVelocity: unknownFactor("A second actual-bearing progress update is required to compute a velocity."),
        scheduleFeasibility: unknownFactor("A second actual-bearing progress update is required to assess feasibility."),
        historicalTrend: unknownFactor("A second actual-bearing progress update is required to assess a trend."),
      },
      aiEvidenceNote: null,
      methodology: INSUFFICIENT_DATA_METHODOLOGY,
    };
  }

  // --- Velocity (reuses Prompt 5's real-elapsed-time trend logic) -------
  const trend = computeProgressTrend(scoped);
  const averageWeeklyProgress = trend.available ? trend.averageGainPerWeek : null;
  const averageDailyProgress = averageWeeklyProgress !== null ? round(averageWeeklyProgress / 7, 3) : null;

  const remainingProgress = Math.max(0, round(100 - latestActualProgress, 2));
  const daysRemaining = daysBetweenDates(latestDate, expectedEndDate);

  const requiredDailyProgress =
    remainingProgress <= 0 ? 0 : daysRemaining <= 0 ? null : round(remainingProgress / daysRemaining, 3);

  const velocityRatio =
    remainingProgress <= 0 || averageDailyProgress === null || requiredDailyProgress === null || requiredDailyProgress <= 0
      ? null
      : round(Math.max(0, averageDailyProgress) / requiredDailyProgress, 2);

  // --- Estimated completion date & predicted delay -----------------------
  let estimatedCompletionDate: Date | null = null;
  let scheduleDeltaDays: number | null = null;
  let predictedDelayDays: number | null = null;
  let status: SchedulePredictionStatus;
  let feasibilityNote: string;

  if (remainingProgress <= 0) {
    estimatedCompletionDate = latestDate;
    scheduleDeltaDays = daysBetweenDates(expectedEndDate, latestDate);
    predictedDelayDays = Math.max(0, scheduleDeltaDays);
    status = scheduleDeltaDays < 0 ? "EARLY" : scheduleDeltaDays === 0 ? "ON_TRACK" : "DELAYED";
    feasibilityNote = "Actual progress has already reached or exceeded 100%, so no further pace is required.";
  } else if (averageDailyProgress === null) {
    // Zero elapsed calendar time between the actual-bearing records used
    // (e.g. duplicate/same-day entries) — a rate genuinely cannot be
    // computed, so no completion date is fabricated. Fall back to the
    // real, already-recorded schedule variance for the outcome.
    status = currentDeviation === null || currentDeviation === 0 ? "ON_TRACK" : currentDeviation > 0 ? "EARLY" : "DELAYED";
    feasibilityNote =
      "The actual-bearing progress updates used share the same (or too little separation in) calendar date, so a daily/weekly progress rate cannot be computed.";
  } else if (averageDailyProgress <= 0) {
    // Stalled or regressing progress with work still remaining: under the
    // current trend the project will never complete, so no completion
    // date is fabricated.
    status = "DELAYED";
    feasibilityNote = `Progress has been flat or regressing (${averageWeeklyProgress}% per week) with ${remainingProgress}% of work remaining — at this rate the project will not complete.`;
  } else {
    const estimatedRemainingDays = remainingProgress / averageDailyProgress;
    estimatedCompletionDate = new Date(latestDate.getTime() + estimatedRemainingDays * MS_PER_DAY);
    scheduleDeltaDays = daysBetweenDates(expectedEndDate, estimatedCompletionDate);
    predictedDelayDays = Math.max(0, scheduleDeltaDays);
    status = scheduleDeltaDays < 0 ? "EARLY" : scheduleDeltaDays === 0 ? "ON_TRACK" : "DELAYED";
    feasibilityNote =
      velocityRatio === null
        ? requiredDailyProgress === null
          ? "The project's expected end date has already passed with work still remaining, so a required daily pace cannot be computed."
          : "Required daily pace could not be compared to the observed rate."
        : velocityRatio >= 1.0
          ? `Observed pace (${averageDailyProgress}%/day) meets or exceeds the ${requiredDailyProgress}%/day required to finish by the expected end date.`
          : velocityRatio >= 0.8
            ? `Observed pace (${averageDailyProgress}%/day) is close to, but below, the ${requiredDailyProgress}%/day required to finish on time.`
            : `Observed pace (${averageDailyProgress}%/day) is well below the ${requiredDailyProgress}%/day required to finish by the expected end date (${round(velocityRatio * 100, 0)}% of the required rate).`;
  }

  // --- Factor scoring & weighted formulas (documented weights) ----------
  const totalPlannedDays = Math.max(1, daysBetweenDates(startDate, expectedEndDate));
  const varianceScore = varianceFactorScore(currentDeviation);
  const velocityScore = velocityFactorScore({ remainingProgress, averageDailyProgress, requiredDailyProgress, velocityRatio });
  const trendResult = trendFactorScore(actualBearing);
  const deltaScore = scheduleDeltaFactorScore({ predictedDelayDays, averageDailyProgress, remainingProgress, totalPlannedDays });

  // Estimated Delay Probability: 40% schedule variance + 40% velocity adequacy + 20% historical trend.
  const estimatedDelayProbability = Math.min(
    100,
    Math.max(0, Math.round(0.4 * varianceScore + 0.4 * velocityScore + 0.2 * trendResult.score)),
  );
  // Schedule Risk Score: 30% variance + 30% velocity + 25% predicted schedule delta + 15% historical trend.
  const riskScore = Math.min(
    100,
    Math.max(0, Math.round(0.3 * varianceScore + 0.3 * velocityScore + 0.25 * deltaScore + 0.15 * trendResult.score)),
  );
  const riskLevel = classifyPredictionRiskLevel(riskScore);

  const progressVelocityFactor: DelayPredictionFactor =
    averageWeeklyProgress === null
      ? unknownFactor(
          "The actual-bearing progress updates used share the same (or too little separation in) calendar date, so a velocity cannot be computed.",
        )
      : {
          value: averageWeeklyProgress,
          impact: averageWeeklyProgress > 0 ? (velocityScore <= 35 ? "POSITIVE" : "NEUTRAL") : "NEGATIVE",
          explanation: `Real elapsed-time progress velocity is ${averageWeeklyProgress}% per week (${averageDailyProgress}% per day), computed from ${usableRecordCount} actual-bearing progress updates.`,
        };

  const scheduleFeasibilityFactor: DelayPredictionFactor = {
    value: velocityRatio,
    impact:
      velocityRatio === null
        ? remainingProgress <= 0
          ? "POSITIVE"
          : "UNKNOWN"
        : velocityRatio >= 1.0
          ? "POSITIVE"
          : velocityRatio >= 0.8
            ? "NEUTRAL"
            : "NEGATIVE",
    explanation: feasibilityNote,
  };

  const historicalTrendFactor: DelayPredictionFactor =
    trendResult.direction === "UNKNOWN"
      ? unknownFactor("At least three actual-bearing progress updates are required to assess a historical trend (distinct from the single-step schedule variance above).")
      : {
          value: trendResult.direction,
          impact: trendResult.direction === "IMPROVING" ? "POSITIVE" : trendResult.direction === "WORSENING" ? "NEGATIVE" : "NEUTRAL",
          explanation:
            trendResult.direction === "IMPROVING"
              ? "Schedule deviation has been improving (getting less negative or more positive) across the most recent progress updates."
              : trendResult.direction === "WORSENING"
                ? "Schedule deviation has been worsening (getting more negative) across the most recent progress updates."
                : "Schedule deviation has stayed roughly stable across the most recent progress updates.",
        };

  return {
    status,
    dataSufficiency,
    usableRecordCount,
    asOfDate,
    latestActualProgress,
    latestPlannedProgress,
    currentDeviation,
    averageDailyProgress,
    averageWeeklyProgress,
    requiredDailyProgress,
    velocityRatio,
    estimatedCompletionDate: estimatedCompletionDate ? estimatedCompletionDate.toISOString() : null,
    expectedCompletionDate,
    scheduleDeltaDays,
    predictedDelayDays,
    riskScore,
    riskLevel,
    estimatedDelayProbability,
    factors: {
      scheduleVariance: scheduleVarianceFactor,
      progressVelocity: progressVelocityFactor,
      scheduleFeasibility: scheduleFeasibilityFactor,
      historicalTrend: historicalTrendFactor,
    },
    aiEvidenceNote: null,
    methodology:
      `Analytical velocity-based projection (Prompt 6): schedule variance and progress velocity are computed from ` +
      `${usableRecordCount} actual-bearing progress records (${dataSufficiency.toLowerCase()} data sufficiency) spanning real ` +
      `elapsed calendar time. Risk score and delay probability are deterministic weighted combinations of documented factors. ` +
      `See docs/delay-prediction.md for the full methodology and worked example.`,
  };
}

export interface DelayPredictionSnapshot {
  asOfDate: string;
  status: SchedulePredictionStatus;
  dataSufficiency: DataSufficiency;
  riskLevel: PredictionRiskLevel | null;
  riskScore: number | null;
  predictedDelayDays: number | null;
}

/**
 * Reconstructs how the prediction would have looked after each progress
 * update, purely by re-running `computeDelayPrediction()` with an
 * increasingly later `asOfDate` cutoff — no snapshot persistence required
 * (see the persistence decision in docs/delay-prediction.md). Skips the
 * single earliest actual-bearing record, since that state is always
 * INSUFFICIENT_DATA by definition.
 */
export function computeDelayPredictionHistory(
  project: DelayPredictionProjectInput,
  records: ProgressRecordLike[],
): DelayPredictionSnapshot[] {
  const actualBearing = records
    .filter((record) => record.actualProgress !== null && record.actualProgress !== undefined)
    .sort((a, b) => toDate(a.recordDate).getTime() - toDate(b.recordDate).getTime());

  return actualBearing.slice(1).map((record) => {
    const prediction = computeDelayPrediction(project, records, { asOfDate: record.recordDate });
    return {
      asOfDate: prediction.asOfDate as string,
      status: prediction.status,
      dataSufficiency: prediction.dataSufficiency,
      riskLevel: prediction.riskLevel,
      riskScore: prediction.riskScore,
      predictedDelayDays: prediction.predictedDelayDays,
    };
  });
}

/**
 * Optional, secondary-only note built from REAL YOLO11 detection counts
 * (see lib/services/ai-evidence.ts's `compareDetections()`). Purely
 * factual ("detections increased from X to Y") — this function must never
 * be extended to translate a detection change into a progress/delay claim.
 */
export function buildAiEvidenceNote(
  comparison: DetectionComparison,
  earlierDate: string,
  laterDate: string,
): string | null {
  if (comparison.totalEarlier === 0 && comparison.totalLater === 0) return null;
  const days = isoDaysBetween(earlierDate, laterDate);
  const direction =
    comparison.totalChange > 0 ? "increased" : comparison.totalChange < 0 ? "decreased" : "stayed the same";
  return (
    `Total YOLO11 object detections across analyzed images ${direction} from ${comparison.totalEarlier} to ` +
    `${comparison.totalLater} over ${days} day${days === 1 ? "" : "s"}. This is supporting visual evidence only — ` +
    `it is not used in the risk score or delay projection above.`
  );
}
