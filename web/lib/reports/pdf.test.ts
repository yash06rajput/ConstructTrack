import { test } from "node:test";
import assert from "node:assert/strict";

import { generateReportPdf } from "@/lib/reports/pdf";
import { buildReportData } from "@/lib/services/report-builder";

const SAMPLE_REPORT = buildReportData({
  project: {
    name: "Green Valley Residential Complex",
    description: "A 120-unit residential complex.",
    location: "Pune, Maharashtra",
    status: "IN_PROGRESS",
    startDate: "2026-01-01",
    expectedEndDate: "2026-08-01",
  },
  records: [
    { id: "r1", recordDate: "2026-01-01", plannedProgress: 20, actualProgress: 20, deviation: 0, status: "ON_TRACK", notes: null },
    { id: "r2", recordDate: "2026-01-21", plannedProgress: 45, actualProgress: 40, deviation: -5, status: "AT_RISK", notes: null },
  ],
  images: [
    { id: "img1", originalFilename: "site-1.jpg", uploadedAt: "2026-01-01", analysisStatus: "COMPLETED", objectCounts: { person: 4 } },
    { id: "img2", originalFilename: "site-2.jpg", uploadedAt: "2026-01-13", analysisStatus: "COMPLETED", objectCounts: { person: 7 } },
  ],
  aiModelVersion: "yolo11n",
  aiAverageConfidence: 0.83,
  generatedAt: "2026-03-01T00:00:00.000Z",
});

test("generateReportPdf: produces a real, non-empty PDF buffer", async () => {
  const buffer = await generateReportPdf(SAMPLE_REPORT);
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 1000, `expected a substantial PDF, got ${buffer.length} bytes`);
  // Every valid PDF file starts with this magic header.
  assert.equal(buffer.subarray(0, 5).toString("ascii"), "%PDF-");
});

test("generateReportPdf: also succeeds for an insufficient-data (near-empty) report", async () => {
  const emptyReport = buildReportData({
    project: {
      name: "New Site",
      description: null,
      location: null,
      status: "PLANNING",
      startDate: "2026-01-01",
      expectedEndDate: "2026-12-31",
    },
    records: [],
    images: [],
    aiModelVersion: null,
    aiAverageConfidence: null,
    generatedAt: "2026-01-01T00:00:00.000Z",
  });
  const buffer = await generateReportPdf(emptyReport);
  assert.ok(buffer.length > 500);
  assert.equal(buffer.subarray(0, 5).toString("ascii"), "%PDF-");
});

test("generateReportPdf: rejects (does not hang or throw synchronously) on malformed report data", async () => {
  // Simulates a corrupted/partial reportData snapshot — e.g. a future
  // schema change or a hand-edited DB row — so the PDF route's error
  // handling (which now routes this rejection through the same
  // toErrorResponse the rest of the API uses, see
  // app/api/reports/[id]/pdf/route.ts) has something real to catch.
  const malformedReport = { ...SAMPLE_REPORT, executiveSummary: null } as unknown as Parameters<typeof generateReportPdf>[0];
  await assert.rejects(() => generateReportPdf(malformedReport));
});
