import { test } from "node:test";
import assert from "node:assert/strict";

import { buildReportData } from "@/lib/services/report-builder";
import { computeDelayPrediction } from "@/lib/services/delay-prediction";
import { computeProgressSummary } from "@/lib/services/progress-analytics";

const BASE_PROJECT = {
  name: "Green Valley Residential Complex",
  description: "A 120-unit residential complex.",
  location: "Pune, Maharashtra",
  status: "IN_PROGRESS" as const,
  startDate: "2026-01-01",
  expectedEndDate: "2026-08-01",
};

test("buildReportData: no progress records, no images -> nothing fabricated anywhere", () => {
  const report = buildReportData({
    project: BASE_PROJECT,
    records: [],
    images: [],
    aiModelVersion: null,
    aiAverageConfidence: null,
    generatedAt: "2026-03-01T00:00:00.000Z",
  });

  assert.equal(report.executiveSummary.prediction.status, "INSUFFICIENT_DATA");
  assert.equal(report.progressAnalytics.current.hasData, false);
  assert.equal(report.projectOverview.progressRecordCount, 0);
  assert.equal(report.projectOverview.imageCount, 0);
  assert.equal(report.projectOverview.analyzedImageCount, 0);
  assert.equal(report.projectOverview.latestProgressRecordDate, null);
  assert.equal(report.aiAnalysis.available, false);
  assert.equal(report.imageSummary.totalImages, 0);
  // No progress records -> reporting period falls back to the project's own real dates.
  assert.equal(report.header.reportingPeriodStart, BASE_PROJECT.startDate);
  assert.equal(report.header.reportingPeriodEnd, "2026-03-01T00:00:00.000Z");
});

const RECORDS = [
  { id: "r1", recordDate: "2026-01-01", plannedProgress: 20, actualProgress: 20, deviation: 0, status: "ON_TRACK" as const, notes: null },
  { id: "r2", recordDate: "2026-01-21", plannedProgress: 45, actualProgress: 40, deviation: -5, status: "AT_RISK" as const, notes: null },
];

test("buildReportData: delay prediction is byte-for-byte the same object the Prompt 6 engine produces (no reimplementation)", () => {
  const report = buildReportData({
    project: BASE_PROJECT,
    records: RECORDS,
    images: [],
    aiModelVersion: null,
    aiAverageConfidence: null,
  });

  const direct = computeDelayPrediction(
    { startDate: BASE_PROJECT.startDate, expectedEndDate: BASE_PROJECT.expectedEndDate },
    RECORDS,
  );
  assert.deepEqual(report.delayPrediction, direct);
  assert.deepEqual(report.executiveSummary.prediction, direct);
});

test("buildReportData: progress analytics is byte-for-byte the same object the Prompt 5 engine produces", () => {
  const report = buildReportData({
    project: BASE_PROJECT,
    records: RECORDS,
    images: [],
    aiModelVersion: null,
    aiAverageConfidence: null,
  });

  const direct = computeProgressSummary(RECORDS);
  assert.deepEqual(report.progressAnalytics.current, direct);
  assert.equal(report.executiveSummary.recordedProgress, direct.currentActual);
  assert.equal(report.executiveSummary.variance, direct.variance);
});

test("buildReportData: reporting period uses the earliest/latest REAL progress-record dates, not invented ones", () => {
  const report = buildReportData({
    project: BASE_PROJECT,
    records: RECORDS,
    images: [],
    aiModelVersion: null,
    aiAverageConfidence: null,
  });
  assert.equal(report.header.reportingPeriodStart, "2026-01-01");
  assert.equal(report.header.reportingPeriodEnd, "2026-01-21");
  assert.equal(report.projectOverview.latestProgressRecordDate, "2026-01-21");
});

test("buildReportData: header/project overview surface real project fields verbatim", () => {
  const report = buildReportData({
    project: BASE_PROJECT,
    records: [],
    images: [],
    aiModelVersion: null,
    aiAverageConfidence: null,
  });
  assert.equal(report.header.projectName, BASE_PROJECT.name);
  assert.equal(report.header.projectLocation, BASE_PROJECT.location);
  assert.equal(report.projectOverview.description, BASE_PROJECT.description);
  assert.equal(report.projectOverview.status, BASE_PROJECT.status);
});
