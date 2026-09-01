import type { ProgressStatus } from "@prisma/client";

import { computeDeviation, computeProgressStatus } from "@/lib/services/progress";

/**
 * Server- and client-safe (no Prisma/Next.js imports) progress analytics.
 * Deliberately pure and deterministic: given the same records, always
 * produces the same result, and never fabricates a value when the real
 * data doesn't support one — insufficient-data cases return an explicit
 * "unavailable" state instead of guessing.
 */

export interface ProgressRecordLike {
  recordDate: Date | string;
  plannedProgress: number;
  actualProgress: number | null;
}

export interface ProgressTrend {
  available: boolean;
  /** Human-readable reason when `available` is false. */
  reason: string | null;
  /** actualProgress(last) - actualProgress(previous), in percentage points. */
  progressChange: number | null;
  /**
   * (actualProgress(last) - actualProgress(first)) / weeksElapsed, using the
   * REAL elapsed calendar time between the first and last actual-bearing
   * records — not an assumed weekly cadence. Null if the two records share
   * a date (zero elapsed time) or fewer than 2 actual-bearing records exist.
   */
  averageGainPerWeek: number | null;
  firstActualDate: string | null;
  lastActualDate: string | null;
}

export interface ProgressSummary {
  hasData: boolean;
  asOfDate: string | null;
  currentPlanned: number | null;
  currentActual: number | null;
  variance: number | null;
  varianceAvailable: boolean;
  /** Null when `actualProgress` hasn't been recorded for the latest record. */
  status: ProgressStatus | null;
  statusLabel: string | null;
  trend: ProgressTrend;
}

/**
 * Presentation labels for the project-level KPI card. These map 1:1 onto
 * the existing ProgressStatus enum and PROGRESS_STATUS_THRESHOLDS (see
 * lib/services/progress.ts) — this is a *current variance classification*,
 * not a prediction. Delay prediction is a separate, later concern.
 */
export const PROGRESS_KPI_STATUS_LABELS: Record<ProgressStatus, string> = {
  AHEAD: "Ahead of Plan",
  ON_TRACK: "On Track",
  AT_RISK: "Slightly Behind",
  DELAYED: "Significantly Behind",
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function sortByDateAsc<T extends { recordDate: Date | string }>(records: T[]): T[] {
  return [...records].sort((a, b) => toDate(a.recordDate).getTime() - toDate(b.recordDate).getTime());
}

const INSUFFICIENT_TREND_DATA =
  "At least two progress updates with a recorded actual value are required.";

export function computeProgressTrend(records: ProgressRecordLike[]): ProgressTrend {
  const withActuals = sortByDateAsc(records).filter(
    (record): record is ProgressRecordLike & { actualProgress: number } =>
      record.actualProgress !== null && record.actualProgress !== undefined,
  );

  if (withActuals.length < 2) {
    return {
      available: false,
      reason: INSUFFICIENT_TREND_DATA,
      progressChange: null,
      averageGainPerWeek: null,
      firstActualDate: null,
      lastActualDate: null,
    };
  }

  const first = withActuals[0];
  const last = withActuals[withActuals.length - 1];
  const previous = withActuals[withActuals.length - 2];

  const progressChange = Math.round((last.actualProgress - previous.actualProgress) * 100) / 100;

  const daysElapsed =
    (toDate(last.recordDate).getTime() - toDate(first.recordDate).getTime()) / (1000 * 60 * 60 * 24);
  const weeksElapsed = daysElapsed / 7;
  const averageGainPerWeek =
    weeksElapsed > 0
      ? Math.round(((last.actualProgress - first.actualProgress) / weeksElapsed) * 100) / 100
      : null;

  return {
    available: true,
    reason: null,
    progressChange,
    averageGainPerWeek,
    firstActualDate: toDate(first.recordDate).toISOString(),
    lastActualDate: toDate(last.recordDate).toISOString(),
  };
}

export function computeProgressSummary(records: ProgressRecordLike[]): ProgressSummary {
  const trend = computeProgressTrend(records);

  if (records.length === 0) {
    return {
      hasData: false,
      asOfDate: null,
      currentPlanned: null,
      currentActual: null,
      variance: null,
      varianceAvailable: false,
      status: null,
      statusLabel: null,
      trend,
    };
  }

  const current = sortByDateAsc(records)[records.length - 1];
  const variance = computeDeviation(current.plannedProgress, current.actualProgress);
  const status = computeProgressStatus(variance);

  return {
    hasData: true,
    asOfDate: toDate(current.recordDate).toISOString(),
    currentPlanned: current.plannedProgress,
    currentActual: current.actualProgress ?? null,
    variance,
    varianceAvailable: variance !== null,
    status,
    statusLabel: status ? PROGRESS_KPI_STATUS_LABELS[status] : null,
    trend,
  };
}
