# Automated Construction Progress & Risk Reporting

This document describes the reporting system of ConstructTrack: a
server-generated, structured report that turns a project's already-real
data — progress records, construction images, YOLO11 detections, and the
progress-analytics and delay-prediction engines — into a professional web report and PDF
export. It never computes a new metric; it composes existing ones.

## Architecture

```
lib/
├── reports/
│   ├── types.ts          — the ReportData contract (reuses ProgressSummary,
│   │                        DelayPredictionResult, DetectionComparison types)
│   ├── formatting.ts      — static methodology/disclaimer prose, shared by
│   │                        the web view and the PDF so they never diverge
│   └── pdf.ts             — pdfkit-based PDF renderer
├── services/
│   ├── report-analytics.ts — report-only aggregations (image-status counts,
│   │                         AI object-count table) — NOT a re-implementation
│   │                         of progress/delay analytics
│   ├── report-builder.ts   — pure composition: calls computeProgressSummary()
│   │                         and computeDelayPrediction() directly, then
│   │                         assembles the full ReportData
│   └── reports.ts          — Prisma-backed data collection + persistence
│                              (generateReport, listReports, listAllReports,
│                              getReportById) — extends the existing initial
│                              stub rather than adding a parallel file
├── serializers/report.ts   — Report row -> JSON-safe API/UI shape
└── validation/report.ts    — generateReportSchema ({ projectId } only)
```

This keeps a clear separation between **data collection**
(`reports.ts`, via `getProjectOrThrow`/`listImages` — already-existing
services, not re-queried from scratch), **analytics** (the untouched
progress-analytics and delay-prediction engines, plus `report-analytics.ts` for the two pieces that
don't already exist), **composition** (`report-builder.ts`, pure and unit
tested), and **presentation** (`components/reports/report-view.tsx` for
the web, `lib/reports/pdf.ts` for the PDF).

## Data sources

Every value in a report comes from one of:

- `Project` (name, description, location, dates, status) via the existing
  `getProjectOrThrow()`.
- `ProgressRecord[]` via `toProjectDetailData()` — the same serializer the
  project detail page already uses.
- `ConstructionImage[]` (with `AIAnalysis` counts) via the existing
  `listImages()`/`toImageSummary()`.
- A small, dedicated `AIAnalysis` query (model version + average
  confidence across completed analyses) — the only new database query
  the reporting module added, since that aggregate wasn't already exposed anywhere.

No value is ever invented. Every "unavailable" case renders the literal
text **"Data unavailable"** / **"Insufficient data"** rather than a
placeholder number — see `lib/reports/types.ts`'s nullable fields and the
empty-state handling throughout `report-view.tsx` and `pdf.ts`.

## Report sections

Header → Executive Summary → Project Overview → Progress Analytics →
Historical Progress (table + planned-vs-actual chart) → Construction
Image Summary (timeline) → AI Computer-Vision Analysis (object-count
table + earlier/later detection comparison) → Delay Prediction → Risk
Analysis → Methodology → Limitations & Disclaimer. Same order in the web
view, the PDF, and `lib/reports/types.ts`'s `ReportData` shape.

## Analytics reused (not duplicated)

- **Progress**: `computeProgressSummary()` (`lib/services/progress-analytics.ts`)
  — current actual/planned/variance/status/trend.
- **Delay & risk**: `computeDelayPrediction()` (`lib/services/delay-prediction.ts`)
  — estimated completion date, predicted delay, Schedule Risk Score,
  Estimated Delay Probability, data sufficiency, and the four risk
  factors. The exact same weighting and terminology from
  `docs/delay-prediction.md` — nothing here re-derives or renames it.
- **AI evidence**: `buildObjectCountHistory()`/`compareDetections()`
  (`lib/services/ai-evidence.ts`) for the object-count table and the
  earlier/later detection comparison. Detections are always labeled
  visual evidence, never a progress measurement.

## Persistence decision

The existing `Report` model (`id`, `projectId`, `progressRecordId?`,
`title`, `reportData Json`, `reportUrl?`, `generatedAt`) was inspected
first. Its `reportData Json` field is exactly the "structured snapshot"
shape a generated report needs, so **no schema change was made**. A
report is generated synchronously (no background job/queue), so there is
no pending/failed generation state to track and therefore no `status`
column was added; likewise there is currently only one report kind
("Progress & Risk Report"), so no `type` column was added either — both
are noted here as deliberate scope decisions, not oversights. `reportUrl`
stays unused: the PDF is rendered on demand from the stored `reportData`
snapshot (`GET /api/reports/[id]/pdf`) rather than pre-generated and
uploaded to storage, which avoids storing a duplicate binary per report.

`createReportSchema`/`createReport()` — the initial stub that let a
client submit `reportData` directly — was replaced with
`generateReportSchema` (`{ projectId }` only) and `generateReport()`,
which computes everything server-side. This is a deliberate, necessary
change to that stub (it was explicitly marked "foundation only" for a
later phase), not a rewrite of working architecture.

## API endpoints

- `GET /api/reports` — all reports (optionally `?projectId=` to scope to
  one project).
- `POST /api/reports` — body `{ "projectId": "..." }` only. Generates and
  persists a new report. Rejects/ignores any other client-supplied field
  (riskScore, delayProbability, completionPercentage,
  predictedCompletionDate, detectedObjects are never accepted — zod's
  schema only recognizes `projectId`).
- `GET /api/reports/[id]` — one report's full data.
- `GET /api/reports/[id]/pdf` — streams the PDF (`Content-Type:
  application/pdf`), built from the report's persisted `reportData`
  snapshot. Runs on the Node runtime (`export const runtime = "nodejs"`)
  since pdfkit needs Node's Buffer/stream APIs.

All four reuse the existing `ApiError`/`withApiErrorHandling`/`ok()`/
`created()` conventions — no second response envelope.

## PDF generation

Server-side, via `pdfkit` (added as a new dependency — no other PDF tool
existed in this project). Deliberately **textual/tabular**, not a
pixel-perfect recreation of the web page: pdfkit has no native chart
renderer and no headless-browser dependency was introduced (Puppeteer et
al. would have meant a much heavier, more fragile dependency for a
B.Tech project). The web report's Recharts chart is therefore the primary
place to see the progress chart visually; the PDF instead presents that
same data as the Historical Progress table, which every number in the
chart also appears in. This is the "prioritize a reliable textual/table
report ... document the limitation" fallback the design explicitly
allows.

## UI

- `/reports` — every report across all projects, plus a project picker +
  "Generate Report" control.
- `/reports/[id]` — the full report view, with Print and Download PDF
  actions.
- Project detail page (`/projects/[id]`) — a "Reports" section (replacing
  the earlier placeholder) listing that project's reports with a
  "Generate Report" button; generation needs no manual input.
- Print styles (`app/globals.css`): app chrome (sidebar/header) hidden via
  a `.no-print` utility class; cards/table rows avoid splitting across a
  page break; table headers repeat on each printed page.

## Security

The client can only ever submit a `projectId`. Every computed value
(progress, AI evidence, delay prediction, risk score) is read from the
database and passed through the existing, unmodified progress-analytics and delay-prediction engines
server-side. No Supabase service-role key, database credentials,
filesystem paths, or Python-service internals are exposed by any report
endpoint.

**Hardening note:** `GET /api/reports/[id]/pdf` originally only
mapped errors from the report lookup through the standard
`{success:false,error:{code,message}}` envelope — a failure inside PDF
rendering itself (`generateReportPdf`) was left uncaught, which would have
produced a generic Next.js error response instead of the app's normal
error shape. The whole handler is now wrapped so both failure points go
through the same `toErrorResponse()` (exported from `lib/api/handler.ts`
for this reuse) that every other route already uses — no new
error-handling pattern was introduced. Covered by a new regression test in
`lib/reports/pdf.test.ts` (`generateReportPdf` rejects rather than hangs
on malformed report data).

Separately, `lib/services/ai-service-client.ts` used to forward the Python
AI service's raw error `detail` string straight into the client-facing
`ApiError` message for 422/503 responses. That upstream text can, in
principle, include implementation fragments (e.g. a raw exception message)
that shouldn't reach the browser. It's now logged server-side only; the
client-facing message is a fixed, safe string. This did not touch the
YOLO11 pipeline or the AI service itself — only the boundary where its
response crosses into the public-facing API.

## Testing

`lib/services/report-analytics.test.ts`, `lib/services/report-builder.test.ts`,
and `lib/reports/pdf.test.ts` (node:test, following the existing
convention) cover: image-status counting and timeline ordering, AI
object-count aggregation and earlier/later comparison, empty/insufficient
states (no records, no images, no analyzed images), and — the most
important check — that `buildReportData()`'s `delayPrediction` and
`progressAnalytics.current` are `deepEqual` to calling
`computeDelayPrediction()`/`computeProgressSummary()` directly, proving
the report builder never reimplements those formulas. PDF tests verify a
real, non-empty `%PDF-`-prefixed buffer is produced, including for a
near-empty (insufficient-data) report.

Not implemented: Prisma-backed API route integration tests (valid/missing/
invalid project ID) — this project's existing test setup (`node:test` via
`tsx`) has never included a database-backed test harness so
far, and introducing one (a test database, request mocking) for this
module alone would be disproportionate scope for a B.Tech minor project.
Route-level correctness was instead verified via `tsc`/`eslint`/manual
review of the (thin) route handlers, which do nothing but validate input
and delegate to the already-unit-tested service/builder functions.

## Limitations

- The PDF is textual/tabular rather than a full visual replica of the web
  report (no embedded chart image) — see "PDF generation" above.
- No report "type" or generation "status" exists in the data model, since
  generation is synchronous and there is currently one report kind.
- Reports are point-in-time snapshots (`reportData` is stored at
  generation time); editing progress records afterward does not update a
  previously generated report — a new report must be generated to see
  updated numbers, which matches how a real progress report works.
