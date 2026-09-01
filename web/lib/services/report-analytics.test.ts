import { test } from "node:test";
import assert from "node:assert/strict";

import { computeReportAiAnalysis, computeReportImageSummary, type ReportImageInput } from "@/lib/services/report-analytics";

const IMG = (overrides: Partial<ReportImageInput>): ReportImageInput => ({
  id: "img-1",
  originalFilename: "site.jpg",
  uploadedAt: "2026-01-01",
  analysisStatus: "PENDING",
  objectCounts: null,
  ...overrides,
});

test("computeReportImageSummary: empty input -> all zeros, empty timeline", () => {
  const summary = computeReportImageSummary([]);
  assert.deepEqual(summary, { totalImages: 0, analyzedImages: 0, pendingImages: 0, failedImages: 0, timeline: [] });
});

test("computeReportImageSummary: counts each status bucket correctly", () => {
  const summary = computeReportImageSummary([
    IMG({ id: "1", analysisStatus: "PENDING" }),
    IMG({ id: "2", analysisStatus: "PROCESSING" }),
    IMG({ id: "3", analysisStatus: "COMPLETED", objectCounts: { person: 2 } }),
    IMG({ id: "4", analysisStatus: "COMPLETED", objectCounts: { truck: 1 } }),
    IMG({ id: "5", analysisStatus: "FAILED" }),
  ]);
  assert.equal(summary.totalImages, 5);
  assert.equal(summary.analyzedImages, 2);
  assert.equal(summary.pendingImages, 2);
  assert.equal(summary.failedImages, 1);
});

test("computeReportImageSummary: timeline is sorted chronologically and totalDetections is null when unanalyzed", () => {
  const summary = computeReportImageSummary([
    IMG({ id: "later", uploadedAt: "2026-02-01", analysisStatus: "COMPLETED", objectCounts: { person: 3, truck: 1 } }),
    IMG({ id: "earlier", uploadedAt: "2026-01-01", analysisStatus: "PENDING" }),
  ]);
  assert.equal(summary.timeline[0].id, "earlier");
  assert.equal(summary.timeline[0].totalDetections, null);
  assert.equal(summary.timeline[1].id, "later");
  assert.equal(summary.timeline[1].totalDetections, 4);
});

test("computeReportAiAnalysis: no analyzed images -> unavailable, nothing fabricated", () => {
  const result = computeReportAiAnalysis([IMG({})], { modelVersion: null, averageConfidence: null });
  assert.equal(result.available, false);
  assert.equal(result.analyzedImageCount, 0);
  assert.equal(result.totalDetections, null);
  assert.deepEqual(result.objectCounts, []);
  assert.equal(result.comparison, null);
});

test("computeReportAiAnalysis: single analyzed image -> available but no comparison (need >= 2)", () => {
  const result = computeReportAiAnalysis(
    [IMG({ id: "1", analysisStatus: "COMPLETED", objectCounts: { person: 4 } })],
    { modelVersion: "yolo11n", averageConfidence: 0.82 },
  );
  assert.equal(result.available, true);
  assert.equal(result.analyzedImageCount, 1);
  assert.equal(result.totalDetections, 4);
  assert.equal(result.comparison, null);
  assert.equal(result.modelVersion, "yolo11n");
});

test("computeReportAiAnalysis: aggregates object counts across images and sorts descending", () => {
  const result = computeReportAiAnalysis(
    [
      IMG({ id: "1", analysisStatus: "COMPLETED", objectCounts: { person: 2, truck: 1 } }),
      IMG({ id: "2", analysisStatus: "COMPLETED", objectCounts: { person: 3, bus: 1 } }),
    ],
    { modelVersion: "yolo11n", averageConfidence: null },
  );
  // Stable sort: ties (bus:1, truck:1) keep the order they were first seen in.
  assert.deepEqual(result.objectCounts, [
    { className: "person", count: 5 },
    { className: "truck", count: 1 },
    { className: "bus", count: 1 },
  ]);
  assert.deepEqual(result.uniqueClasses.sort(), ["bus", "person", "truck"]);
});

test("computeReportAiAnalysis: two or more analyzed images -> factual earlier/later comparison", () => {
  const result = computeReportAiAnalysis(
    [
      IMG({ id: "earlier", uploadedAt: "2026-01-01", analysisStatus: "COMPLETED", objectCounts: { person: 4 } }),
      IMG({ id: "later", uploadedAt: "2026-01-13", analysisStatus: "COMPLETED", objectCounts: { person: 7 } }),
    ],
    { modelVersion: "yolo11n", averageConfidence: 0.9 },
  );
  assert.ok(result.comparison);
  assert.equal(result.comparison?.daysBetween, 12);
  assert.equal(result.comparison?.totalEarlier, 4);
  assert.equal(result.comparison?.totalLater, 7);
  assert.equal(result.comparison?.totalChange, 3);
});
