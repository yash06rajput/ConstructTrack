import { test } from "node:test";
import assert from "node:assert/strict";

import { computeProgressSummary, computeProgressTrend } from "@/lib/services/progress-analytics";

test("variance: behind plan (planned=70, actual=64) -> -6", () => {
  const summary = computeProgressSummary([
    { recordDate: "2026-08-01", plannedProgress: 70, actualProgress: 64 },
  ]);
  assert.equal(summary.variance, -6);
  assert.equal(summary.status, "AT_RISK");
  assert.equal(summary.statusLabel, "Slightly Behind");
});

test("variance: ahead of plan (planned=50, actual=55) -> +5", () => {
  const summary = computeProgressSummary([
    { recordDate: "2026-08-01", plannedProgress: 50, actualProgress: 55 },
  ]);
  assert.equal(summary.variance, 5);
  assert.equal(summary.status, "AHEAD");
});

test("variance: on plan (planned=50, actual=50) -> 0", () => {
  const summary = computeProgressSummary([
    { recordDate: "2026-08-01", plannedProgress: 50, actualProgress: 50 },
  ]);
  assert.equal(summary.variance, 0);
  assert.equal(summary.status, "ON_TRACK");
});

test("variance is unavailable when actualProgress has not been recorded", () => {
  const summary = computeProgressSummary([
    { recordDate: "2026-08-01", plannedProgress: 50, actualProgress: null },
  ]);
  assert.equal(summary.varianceAvailable, false);
  assert.equal(summary.variance, null);
  assert.equal(summary.status, null);
});

test("no records -> hasData false, nothing fabricated", () => {
  const summary = computeProgressSummary([]);
  assert.equal(summary.hasData, false);
  assert.equal(summary.currentActual, null);
  assert.equal(summary.trend.available, false);
});

test("current record is the most recent by DATE, not array/insertion order", () => {
  const summary = computeProgressSummary([
    { recordDate: "2026-08-15", plannedProgress: 80, actualProgress: 75 },
    { recordDate: "2026-08-01", plannedProgress: 30, actualProgress: 25 }, // inserted "later" but earlier date
  ]);
  assert.equal(summary.currentPlanned, 80);
  assert.equal(summary.currentActual, 75);
});

test("trend: two records (40 -> 45) over exactly one week -> +5 change, +5/week", () => {
  const trend = computeProgressTrend([
    { recordDate: "2026-08-01", plannedProgress: 40, actualProgress: 40 },
    { recordDate: "2026-08-08", plannedProgress: 45, actualProgress: 45 },
  ]);
  assert.equal(trend.available, true);
  assert.equal(trend.progressChange, 5);
  assert.equal(trend.averageGainPerWeek, 5);
});

test("trend: three records (40, 45, 52) uses last-vs-previous for change, first-vs-last for average", () => {
  const trend = computeProgressTrend([
    { recordDate: "2026-08-01", plannedProgress: 35, actualProgress: 40 },
    { recordDate: "2026-08-08", plannedProgress: 40, actualProgress: 45 },
    { recordDate: "2026-08-15", plannedProgress: 48, actualProgress: 52 },
  ]);
  assert.equal(trend.available, true);
  // last (52) - previous (45)
  assert.equal(trend.progressChange, 7);
  // (52 - 40) over 2 weeks = 6/week
  assert.equal(trend.averageGainPerWeek, 6);
});

test("trend: a single progress record -> unavailable, not fabricated", () => {
  const trend = computeProgressTrend([
    { recordDate: "2026-08-01", plannedProgress: 40, actualProgress: 40 },
  ]);
  assert.equal(trend.available, false);
  assert.match(trend.reason ?? "", /at least two/i);
  assert.equal(trend.progressChange, null);
  assert.equal(trend.averageGainPerWeek, null);
});

test("trend: records with no actualProgress recorded are excluded", () => {
  const trend = computeProgressTrend([
    { recordDate: "2026-08-01", plannedProgress: 40, actualProgress: null },
    { recordDate: "2026-08-08", plannedProgress: 45, actualProgress: null },
  ]);
  assert.equal(trend.available, false);
});

test("trend handles out-of-order input records (sorts by date first)", () => {
  const trend = computeProgressTrend([
    { recordDate: "2026-08-08", plannedProgress: 45, actualProgress: 45 },
    { recordDate: "2026-08-01", plannedProgress: 40, actualProgress: 40 },
  ]);
  assert.equal(trend.progressChange, 5);
});
