import type { ProgressStatus } from "@prisma/client";

/**
 * Deviation is the core signal the whole system is built around:
 *   deviation = actualProgress - plannedProgress
 *
 * A negative deviation means the project is behind schedule.
 */
export function computeDeviation(
  plannedProgress: number,
  actualProgress: number | null | undefined,
): number | null {
  if (actualProgress === null || actualProgress === undefined) return null;
  return Math.round((actualProgress - plannedProgress) * 100) / 100;
}

/**
 * Thresholds (in percentage points of deviation) used to classify a
 * ProgressRecord. Kept as named constants rather than magic numbers so the
 * rule is easy to explain and to tune later.
 */
export const PROGRESS_STATUS_THRESHOLDS = {
  aheadAbove: 3,
  atRiskBelow: -3,
  delayedBelow: -10,
} as const;

export function computeProgressStatus(
  deviation: number | null,
): ProgressStatus | null {
  if (deviation === null) return null;

  if (deviation <= PROGRESS_STATUS_THRESHOLDS.delayedBelow) return "DELAYED";
  if (deviation <= PROGRESS_STATUS_THRESHOLDS.atRiskBelow) return "AT_RISK";
  if (deviation >= PROGRESS_STATUS_THRESHOLDS.aheadAbove) return "AHEAD";
  return "ON_TRACK";
}
