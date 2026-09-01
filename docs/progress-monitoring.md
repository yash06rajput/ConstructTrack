# Progress monitoring (Prompt 5)

This document explains the Construction Progress Monitoring and
Historical Comparison module: what it measures, how each number is
calculated, and — just as importantly — what it deliberately does not
claim.

## What is measured

Two independent kinds of signal feed the progress dashboard, and they are
never blended into a single fabricated number:

1. **Recorded project progress** (`ProgressRecord`) — a person enters a
   planned % and, once measured, an actual % for a given date. This is the
   **authoritative** progress measurement in this system.
2. **AI visual evidence** (`AIAnalysis`, from Prompt 4's real YOLO11
   pipeline) — real object detections on uploaded site photos. This is
   **supporting evidence only**: a factual record of what the model
   actually recognized in a photo, never converted into a completion
   percentage.

## Planned vs. actual

`lib/services/progress.ts` (existing since Prompt 1) computes, per record:

```
deviation = actualProgress - plannedProgress
```

`lib/services/progress-analytics.ts` (new in Prompt 5) computes the
project-level KPIs shown at the top of the project detail page from the
**most recent** `ProgressRecord` by date (not by insertion order):

- `currentActual` / `currentPlanned` — that record's raw values.
- `variance` — `computeDeviation` applied to the current record. Null (not
  0) when `actualProgress` hasn't been recorded yet for that date, shown
  in the UI as "Actual progress not yet recorded" rather than a fake 0%.
- `status` — one of `AHEAD` / `ON_TRACK` / `AT_RISK` / `DELAYED`, using the
  same documented thresholds Prompt 1 already established
  (`PROGRESS_STATUS_THRESHOLDS` in `lib/services/progress.ts`:
  ahead ≥ +3 points, at-risk ≤ -3 points, delayed ≤ -10 points). The KPI
  card presents these with the more explicit labels "Ahead of Plan / On
  Track / Slightly Behind / Significantly Behind" — this is a **current
  variance classification**, not a prediction. Delay *prediction* is a
  separate, later concern.

## Historical trend

Also in `lib/services/progress-analytics.ts`, `computeProgressTrend`:

- Filters to records that actually have a recorded `actualProgress`
  (a record with only a planned value contributes nothing to a trend).
- Requires **at least two** such records — with only one, the UI shows
  "Trend unavailable — at least two progress updates with a recorded
  actual value are required" rather than inventing a slope from a single
  point.
- `progressChange` = the last actual-bearing record's value minus the
  previous one's — a direct, real delta.
- `averageGainPerWeek` = `(last.actual - first.actual) / weeksElapsed`,
  where `weeksElapsed` is computed from the **real elapsed calendar time**
  between the first and last actual-bearing records (`recordDate`
  timestamps) — not an assumed weekly cadence. If records happen to be
  entered weekly (as the seed data is), this reduces to the intuitive
  "average % gained per week"; if they're not evenly spaced, it still
  produces an honest, real number rather than a wrong one.

All of the above are pure, deterministic functions with no I/O — see
`lib/services/progress-analytics.test.ts` for the full test suite (23
tests covering variance, ahead/on-track/behind classification, trend
calculation, insufficient-data handling, and out-of-order input).

## AI evidence: what YOLO11 can and cannot tell you

`lib/services/ai-evidence.ts` operates only on **real, already-persisted**
`AIAnalysis.objectCounts` from Prompt 4's genuine YOLO11 inference. It
provides:

- **Object detection counts over time** (`buildObjectCountHistory`) — a
  chronological series of `{date, totalDetections, objectCounts}` per
  analyzed image, charted in "AI detection trends".
- **Available object classes** (`listAvailableObjectClasses`) — only
  classes the model actually detected somewhere in this project's images;
  the chart's class filter never offers a class that was never seen.
- **Factual detection comparison between two images**
  (`compareDetections`) — a real per-class diff (`earlier`, `later`,
  `change`), shown in the before/after comparison view.

**It does NOT, and must never be made to, provide:**

- A construction completion percentage. `yolo11n.pt` is a generic
  COCO-pretrained (80-class) object detector — it has no notion of
  "foundation", "framing", "40% complete", etc. Any function that turned
  an object count into a percentage would be inventing a number with no
  statistical basis.
- Delay prediction, risk scores, or any forward-looking claim. Those stay
  entirely in the `deviation`-based `ProgressRecord` logic above (and will
  extend into Prompt 6's delay-prediction module, which consumes the
  historical contract below — not the AI evidence).

Every place this evidence appears in the UI (image comparison, detection
trends chart) carries an explicit label — "AI visual evidence" /
"Detected activity" — and, on the comparison view, an inline disclaimer:
*"AI detections are supporting visual evidence... not construction
completion percentages."*

## Image-to-progress association

`ConstructionImage.progressRecordId` (an optional foreign key to
`ProgressRecord`) already existed in the schema since Prompt 1/3 — **no
schema change was needed** for Prompt 5. The upload flow still doesn't
force picking a progress record (Prompt 3's deliberate choice, preserved).
Where the UI needs to relate an image to "when", it uses the image's own
real `uploadedAt` timestamp directly (the timeline, comparison, and
detection-trends views are all organized by upload date) rather than
requiring an explicit link — this is simpler, uses data that's always
present, and doesn't invent a "nearest progress record" heuristic that
could misattribute a photo to the wrong reporting period.

## Academic limitation (explicit statement)

> The current implementation treats recorded project progress
> (`ProgressRecord.actualProgress`/`plannedProgress`) as the authoritative
> progress measurement, and uses computer vision (YOLO11 object detection)
> as supporting visual evidence only. A construction-specific dataset and
> a domain-trained model would be required for a validated, automated
> construction-stage or completion-percentage estimate. No such claim is
> made anywhere in this system.

## Contract prepared for Prompt 6 (delay prediction)

Prompt 6 can consume, per project, without needing any new schema or
service:

```
Project: expectedEndDate (and startDate)
ProgressRecord[]: recordDate, plannedProgress, actualProgress, deviation
  — plus lib/services/progress-analytics.ts's computeProgressSummary()
    (currentActual, currentPlanned, variance, status) and
    computeProgressTrend() (progressChange, averageGainPerWeek)
AIAnalysis evidence (optional, supporting only):
  — lib/services/ai-evidence.ts's buildObjectCountHistory() /
    compareDetections() over analyzed ConstructionImage records
```

No prediction algorithm, predicted completion date, delay probability, or
risk score has been implemented in Prompt 5 — that is explicitly deferred.
