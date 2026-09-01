import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeDataSufficiency,
  classifyPredictionRiskLevel,
  computeDelayPrediction,
  computeDelayPredictionHistory,
  buildAiEvidenceNote,
} from "@/lib/services/delay-prediction";

const PROJECT_EARLY = { startDate: "2026-01-01", expectedEndDate: "2026-04-01" };

// ---------------------------------------------------------------------------
// Data sufficiency (pure classification — 0/1/2/3/5+ records)
// ---------------------------------------------------------------------------

test("data sufficiency: 0 or 1 usable records -> INSUFFICIENT", () => {
  assert.equal(computeDataSufficiency(0), "INSUFFICIENT");
  assert.equal(computeDataSufficiency(1), "INSUFFICIENT");
});

test("data sufficiency: exactly 2 -> LIMITED", () => {
  assert.equal(computeDataSufficiency(2), "LIMITED");
});

test("data sufficiency: 3-4 -> ADEQUATE", () => {
  assert.equal(computeDataSufficiency(3), "ADEQUATE");
  assert.equal(computeDataSufficiency(4), "ADEQUATE");
});

test("data sufficiency: 5+ -> STRONG", () => {
  assert.equal(computeDataSufficiency(5), "STRONG");
  assert.equal(computeDataSufficiency(50), "STRONG");
});

// ---------------------------------------------------------------------------
// Risk-band classification boundaries (0-24 LOW, 25-49 MODERATE, 50-74 HIGH, 75-100 CRITICAL)
// ---------------------------------------------------------------------------

test("risk level bands are exact at every boundary", () => {
  assert.equal(classifyPredictionRiskLevel(0), "LOW");
  assert.equal(classifyPredictionRiskLevel(24), "LOW");
  assert.equal(classifyPredictionRiskLevel(25), "MODERATE");
  assert.equal(classifyPredictionRiskLevel(49), "MODERATE");
  assert.equal(classifyPredictionRiskLevel(50), "HIGH");
  assert.equal(classifyPredictionRiskLevel(74), "HIGH");
  assert.equal(classifyPredictionRiskLevel(75), "CRITICAL");
  assert.equal(classifyPredictionRiskLevel(100), "CRITICAL");
});

// ---------------------------------------------------------------------------
// Insufficient data (0 and 1 actual-bearing records)
// ---------------------------------------------------------------------------

test("insufficient data: zero progress records -> nothing fabricated", () => {
  const result = computeDelayPrediction(PROJECT_EARLY, []);
  assert.equal(result.status, "INSUFFICIENT_DATA");
  assert.equal(result.dataSufficiency, "INSUFFICIENT");
  assert.equal(result.usableRecordCount, 0);
  assert.equal(result.latestActualProgress, null);
  assert.equal(result.riskScore, null);
  assert.equal(result.riskLevel, null);
  assert.equal(result.estimatedDelayProbability, null);
  assert.equal(result.estimatedCompletionDate, null);
  assert.equal(result.predictedDelayDays, null);
  assert.equal(result.factors.scheduleVariance.impact, "UNKNOWN");
});

test("insufficient data: single actual-bearing record still surfaces real variance (planned=0, actual>planned)", () => {
  const result = computeDelayPrediction(PROJECT_EARLY, [
    { recordDate: "2026-01-05", plannedProgress: 0, actualProgress: 5 },
  ]);
  assert.equal(result.status, "INSUFFICIENT_DATA");
  assert.equal(result.dataSufficiency, "INSUFFICIENT");
  assert.equal(result.usableRecordCount, 1);
  // Real, non-fabricated partial data must still be exposed per the prompt's
  // "insufficient" UI requirement (latest progress/planned/variance/count).
  assert.equal(result.latestActualProgress, 5);
  assert.equal(result.latestPlannedProgress, 0);
  assert.equal(result.currentDeviation, 5);
  assert.equal(result.factors.scheduleVariance.impact, "POSITIVE");
  assert.equal(result.factors.progressVelocity.impact, "UNKNOWN");
  assert.equal(result.riskScore, null);
  assert.equal(result.estimatedCompletionDate, null);
});

test("insufficient data: a record with no actualProgress at all does not count toward usableRecordCount", () => {
  const result = computeDelayPrediction(PROJECT_EARLY, [
    { recordDate: "2026-01-05", plannedProgress: 20, actualProgress: null },
  ]);
  assert.equal(result.status, "INSUFFICIENT_DATA");
  assert.equal(result.usableRecordCount, 0);
  assert.equal(result.currentDeviation, null);
  assert.equal(result.factors.scheduleVariance.impact, "UNKNOWN");
});

// ---------------------------------------------------------------------------
// Full worked scenario A — increasing velocity, ahead of the expected end
// date (EARLY). All numbers hand-derived; see comments for the arithmetic.
// ---------------------------------------------------------------------------
// r1: 2026-01-01, planned 20, actual 20
// r2: 2026-01-21 (20 real days later), planned 45, actual 40
// averageDailyProgress = (40-20)/20 = 1.0  -> averageWeeklyProgress = 7
// remainingProgress = 60 -> estimatedRemainingDays = 60
// estimatedCompletionDate = 2026-01-21 + 60 days = 2026-03-22
// expectedEndDate = 2026-04-01 -> scheduleDelta = -10 (10 days EARLY)
// currentDeviation = 40 - 45 = -5 -> varianceScore = 40 (>= -5 band)
// daysRemaining (latest -> expectedEnd) = 70 -> requiredDailyProgress = 60/70 = 0.857
// velocityRatio = 1.0 / 0.857 = 1.17 (>= 1.0 -> velocityScore = 10)
// trend: only 2 actual-bearing records -> UNKNOWN -> trendScore = 50
// deltaScore: predictedDelayDays === 0 -> 5
// riskScore = round(0.3*40 + 0.3*10 + 0.25*5 + 0.15*50) = round(23.75) = 24 -> LOW
// estimatedDelayProbability = round(0.4*40 + 0.4*10 + 0.2*50) = round(30) = 30

const SCENARIO_A_RECORDS = [
  { recordDate: "2026-01-01", plannedProgress: 20, actualProgress: 20 },
  { recordDate: "2026-01-21", plannedProgress: 45, actualProgress: 40 },
];

test("scenario A: increasing velocity projects an EARLY completion with LOW risk", () => {
  const result = computeDelayPrediction(PROJECT_EARLY, SCENARIO_A_RECORDS);

  assert.equal(result.status, "EARLY");
  assert.equal(result.dataSufficiency, "LIMITED");
  assert.equal(result.usableRecordCount, 2);
  assert.equal(result.currentDeviation, -5);
  assert.equal(result.averageDailyProgress, 1);
  assert.equal(result.averageWeeklyProgress, 7);
  assert.equal(result.requiredDailyProgress, 0.857);
  assert.equal(result.velocityRatio, 1.17);
  assert.equal(result.estimatedCompletionDate, new Date("2026-03-22").toISOString());
  assert.equal(result.scheduleDeltaDays, -10);
  assert.equal(result.predictedDelayDays, 0);
  assert.equal(result.riskScore, 24);
  assert.equal(result.riskLevel, "LOW");
  assert.equal(result.estimatedDelayProbability, 30);
  assert.equal(result.factors.scheduleFeasibility.impact, "POSITIVE");
  assert.equal(result.factors.historicalTrend.impact, "UNKNOWN");
});

test("scenario A is deterministic: identical input always produces an identical result", () => {
  const first = computeDelayPrediction(PROJECT_EARLY, SCENARIO_A_RECORDS.map((r) => ({ ...r })));
  const second = computeDelayPrediction(PROJECT_EARLY, SCENARIO_A_RECORDS.map((r) => ({ ...r })));
  assert.deepEqual(first, second);
});

test("scenario A is order-independent: out-of-order input records produce the same result", () => {
  const forward = computeDelayPrediction(PROJECT_EARLY, SCENARIO_A_RECORDS);
  const reversed = computeDelayPrediction(PROJECT_EARLY, [...SCENARIO_A_RECORDS].reverse());
  assert.deepEqual(forward, reversed);
});

// ---------------------------------------------------------------------------
// On-time completion (scheduleDelta === 0 exactly)
// ---------------------------------------------------------------------------

test("delay outcome: projected completion exactly on the expected end date -> ON_TRACK", () => {
  const result = computeDelayPrediction(
    { startDate: "2026-01-01", expectedEndDate: "2026-04-11" },
    [
      { recordDate: "2026-01-01", plannedProgress: 0, actualProgress: 0 },
      { recordDate: "2026-01-11", plannedProgress: 10, actualProgress: 10 },
    ],
  );
  assert.equal(result.status, "ON_TRACK");
  assert.equal(result.scheduleDeltaDays, 0);
  assert.equal(result.predictedDelayDays, 0);
  assert.equal(result.estimatedCompletionDate, new Date("2026-04-11").toISOString());
});

// ---------------------------------------------------------------------------
// Zero / negative velocity ("stalled" and "regressing")
// ---------------------------------------------------------------------------

test("velocity: zero (flat progress) -> DELAYED, no completion date fabricated", () => {
  const result = computeDelayPrediction(PROJECT_EARLY, [
    { recordDate: "2026-01-01", plannedProgress: 20, actualProgress: 10 },
    { recordDate: "2026-01-11", plannedProgress: 30, actualProgress: 10 },
  ]);
  assert.equal(result.averageDailyProgress, 0);
  assert.equal(result.status, "DELAYED");
  assert.equal(result.estimatedCompletionDate, null);
  assert.equal(result.predictedDelayDays, null);
  assert.equal(result.factors.progressVelocity.impact, "NEGATIVE");
});

// ---------------------------------------------------------------------------
// Full worked scenario B — regressing velocity across 3 records, CRITICAL risk.
// r1: 2026-01-01 planned 20 actual 20 (deviation 0)
// r2: 2026-01-11 planned 40 actual 15 (deviation -25)
// r3: 2026-01-21 planned 60 actual 10 (deviation -50)
// averageDailyProgress = (10-20)/20 = -0.5 -> stalled/regressing branch
// varianceScore (deviation -50, < -15) = 90
// velocityScore (averageDailyProgress <= 0) = 90
// trend window = all 3 deviations [0, -25, -50] -> delta = -50 -> WORSENING -> 80
// deltaScore (predictedDelayDays null, averageDailyProgress <= 0) = 100
// riskScore = round(0.3*90 + 0.3*90 + 0.25*100 + 0.15*80) = round(91) = 91 -> CRITICAL
// estimatedDelayProbability = round(0.4*90 + 0.4*90 + 0.2*80) = round(88) = 88
// ---------------------------------------------------------------------------

const SCENARIO_B_RECORDS = [
  { recordDate: "2026-01-01", plannedProgress: 20, actualProgress: 20 },
  { recordDate: "2026-01-11", plannedProgress: 40, actualProgress: 15 },
  { recordDate: "2026-01-21", plannedProgress: 60, actualProgress: 10 },
];
const PROJECT_B = { startDate: "2026-01-01", expectedEndDate: "2026-08-01" };

test("scenario B: regressing velocity across 3 records produces CRITICAL risk with a worsening trend", () => {
  const result = computeDelayPrediction(PROJECT_B, SCENARIO_B_RECORDS);

  assert.equal(result.dataSufficiency, "ADEQUATE");
  assert.equal(result.usableRecordCount, 3);
  assert.equal(result.currentDeviation, -50);
  assert.equal(result.averageDailyProgress, -0.5);
  assert.equal(result.status, "DELAYED");
  assert.equal(result.estimatedCompletionDate, null);
  assert.equal(result.predictedDelayDays, null);
  assert.equal(result.riskScore, 91);
  assert.equal(result.riskLevel, "CRITICAL");
  assert.equal(result.estimatedDelayProbability, 88);
  assert.equal(result.factors.historicalTrend.value, "WORSENING");
  assert.equal(result.factors.historicalTrend.impact, "NEGATIVE");
});

test("scenario B is deterministic across repeated calls", () => {
  const first = computeDelayPrediction(PROJECT_B, SCENARIO_B_RECORDS.map((r) => ({ ...r })));
  const second = computeDelayPrediction(PROJECT_B, SCENARIO_B_RECORDS.map((r) => ({ ...r })));
  assert.deepEqual(first, second);
});

// ---------------------------------------------------------------------------
// Completion edge cases
// ---------------------------------------------------------------------------

test("edge case: actual progress already at/above 100% -> completion date is the record date itself", () => {
  const result = computeDelayPrediction(
    { startDate: "2026-01-01", expectedEndDate: "2026-01-21" },
    [
      { recordDate: "2026-01-01", plannedProgress: 10, actualProgress: 10 },
      { recordDate: "2026-01-11", plannedProgress: 90, actualProgress: 100 },
    ],
  );
  assert.equal(result.estimatedCompletionDate, new Date("2026-01-11").toISOString());
  assert.equal(result.status, "EARLY");
  assert.equal(result.predictedDelayDays, 0);
});

test("edge case: expected end date already passed while work remains -> required velocity and ratio are null, not a crash", () => {
  const result = computeDelayPrediction(
    { startDate: "2026-01-01", expectedEndDate: "2026-01-21" },
    [
      { recordDate: "2026-01-01", plannedProgress: 10, actualProgress: 10 },
      { recordDate: "2026-02-01", plannedProgress: 90, actualProgress: 30 },
    ],
  );
  assert.equal(result.requiredDailyProgress, null);
  assert.equal(result.velocityRatio, null);
  assert.equal(result.status, "DELAYED");
  assert.ok((result.predictedDelayDays ?? 0) > 0);
});

test("edge case: expected end date equals the latest record date (zero days remaining) -> no division by zero", () => {
  const result = computeDelayPrediction(
    { startDate: "2026-01-01", expectedEndDate: "2026-01-11" },
    [
      { recordDate: "2026-01-01", plannedProgress: 10, actualProgress: 10 },
      { recordDate: "2026-01-11", plannedProgress: 30, actualProgress: 30 },
    ],
  );
  assert.equal(result.requiredDailyProgress, null);
  assert.equal(result.velocityRatio, null);
  assert.equal(result.status, "DELAYED");
  assert.equal(result.predictedDelayDays, 35);
});

test("edge case: duplicate/same-day actual-bearing records -> velocity unavailable, falls back to real variance", () => {
  const result = computeDelayPrediction(PROJECT_EARLY, [
    { recordDate: "2026-01-05", plannedProgress: 20, actualProgress: 15 },
    { recordDate: "2026-01-05", plannedProgress: 20, actualProgress: 18 },
  ]);
  assert.equal(result.averageDailyProgress, null);
  assert.equal(result.averageWeeklyProgress, null);
  assert.equal(result.estimatedCompletionDate, null);
  assert.equal(result.predictedDelayDays, null);
  // currentDeviation on the latest (second) record: 18 - 20 = -2 -> DELAYED fallback
  assert.equal(result.currentDeviation, -2);
  assert.equal(result.status, "DELAYED");
});

// ---------------------------------------------------------------------------
// Prediction history (dynamic snapshots, no persistence)
// ---------------------------------------------------------------------------

test("prediction history: one snapshot per actual-bearing record after the first, in chronological order", () => {
  const history = computeDelayPredictionHistory(PROJECT_B, SCENARIO_B_RECORDS);
  assert.equal(history.length, SCENARIO_B_RECORDS.length - 1);
  assert.equal(history[0].asOfDate, new Date("2026-01-11").toISOString());
  assert.equal(history[1].asOfDate, new Date("2026-01-21").toISOString());
  // Risk should only be assessable (non-INSUFFICIENT_DATA) once >= 2 records exist as-of that date.
  assert.notEqual(history[0].status, "INSUFFICIENT_DATA");
  // The final snapshot must match a direct call for the same cutoff.
  const direct = computeDelayPrediction(PROJECT_B, SCENARIO_B_RECORDS, { asOfDate: "2026-01-21" });
  assert.equal(history[1].riskScore, direct.riskScore);
});

test("prediction history: no actual-bearing records -> empty history, not an error", () => {
  assert.deepEqual(computeDelayPredictionHistory(PROJECT_EARLY, []), []);
});

// ---------------------------------------------------------------------------
// Optional AI evidence note — purely factual, never fed back into scoring.
// Deliberately NOT used above as evidence for any delay-prediction test.
// ---------------------------------------------------------------------------

test("AI evidence note: factual detection-count comparison only", () => {
  const note = buildAiEvidenceNote(
    { rows: [], totalEarlier: 4, totalLater: 7, totalChange: 3 },
    "2026-01-01",
    "2026-01-08",
  );
  assert.ok(note?.includes("increased from 4 to 7"));
  assert.ok(note?.includes("not used in the risk score"));
});

test("AI evidence note: no detections in either image -> null (nothing to report)", () => {
  const note = buildAiEvidenceNote({ rows: [], totalEarlier: 0, totalLater: 0, totalChange: 0 }, "2026-01-01", "2026-01-08");
  assert.equal(note, null);
});
