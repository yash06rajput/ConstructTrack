# Delay Prediction & Schedule Risk Methodology

This document supersedes the per-record baseline write-up that used to live
here. That baseline (`estimateDelay()` / `classifyRisk()` in
`lib/services/delay-prediction.ts`) still exists and still powers
`POST /api/delay` and `prisma/seed.ts` unchanged — it is a simple,
single-record, deviation-proportional estimate. This document describes
the newer, richer, project-level engine used by the project detail page
(`computeDelayPrediction()` and friends, in the same file), which is what
powers the "Delay Prediction & Schedule Risk" section on the project
detail page and `GET /api/delay-prediction`.

## 1. Objective

Given a project's own schedule (`startDate`, `expectedEndDate`) and its
recorded progress history (`ProgressRecord[]`), answer three questions
without any machine-learning model and without fabricating any number the
data doesn't support:

1. At the current real-world pace, when will the project actually finish?
2. How many days early/late is that relative to the expected end date?
3. How risky is the current schedule position, expressed as a documented,
   deterministic 0–100 score?

## 2. Inputs

Only real, already-persisted data is used:

- `Project.startDate`, `Project.expectedEndDate`.
- `ProgressRecord[]`: `recordDate`, `plannedProgress`, `actualProgress`
  (nullable — records without an actual value are excluded from velocity
  and risk math, though the latest one's presence is still shown as a
  "record exists but no actual yet" state where relevant).
- Optionally, real YOLO11 `AIAnalysis.objectCounts` from already-analyzed
  images, used **only** to generate a secondary, clearly-labeled factual
  note (see §11) — never as a scoring input.

The client-submitted `projectId` is the only client input the API trusts;
every date, percentage, and detection count is read from the database.

## 3. Schedule variance formula (reused, not duplicated)

```
deviation = actualProgress - plannedProgress
```

Computed with the existing `computeDeviation()` (`lib/services/progress.ts`)
on the most recent progress record that has a recorded `actualProgress`.
Positive = ahead of plan, negative = behind, zero = exactly on plan.

## 4. Progress velocity formula

Uses the **real elapsed calendar time** between the earliest and latest
progress records that have a recorded `actualProgress` — never an assumed
weekly cadence. This reuses the progress-analytics module's `computeProgressTrend()`
(`lib/services/progress-analytics.ts`) directly:

```
averageWeeklyProgress = (latestActual - earliestActual) / weeksElapsed
averageDailyProgress  = averageWeeklyProgress / 7
```

With exactly two actual-bearing records, "earliest" and "latest" are
simply those two records, which is exactly the
`(latest - previous) / elapsedDays` case described for the 2-record
scenario — `computeProgressTrend()` already unifies both cases, so no
separate branch was needed.

If the two records share the same calendar date (zero elapsed time),
`averageWeeklyProgress` is `null` — no rate is fabricated. Progress
velocity is reported based on the deviation instead in this narrow case.

## 5. Required velocity formula

```
remainingProgress    = max(0, 100 - latestActualProgress)
daysRemaining         = expectedEndDate - latestProgressDate   (in days)
requiredDailyProgress = daysRemaining > 0 ? remainingProgress / daysRemaining : null
```

`requiredDailyProgress` is `null` (not zero, not fabricated) when the
expected end date has already passed or falls on the same day as the
latest progress record — there is no meaningful "days left" to divide by.

```
velocityRatio = averageDailyProgress / requiredDailyProgress
```

`velocityRatio` is `null` whenever either side of the ratio is
unavailable, or when `remainingProgress` is already `0` (nothing left to
pace against).

## 6. Estimated completion date formula

```
if remainingProgress <= 0:
    estimatedCompletionDate = latestProgressDate         (already done)
elif averageDailyProgress is null:
    estimatedCompletionDate = null                        (rate unknown)
elif averageDailyProgress <= 0:
    estimatedCompletionDate = null                        (stalled/regressing — never completes at this rate)
else:
    estimatedRemainingDays  = remainingProgress / averageDailyProgress
    estimatedCompletionDate = latestProgressDate + estimatedRemainingDays
```

Full (unrounded) precision is retained internally — the addition uses the
fractional day count directly rather than rounding first — and only the
final displayed date is rounded to a calendar day. No completion date is
ever invented when the underlying rate is zero, negative, or unknown.

## 7. Predicted delay formula

```
scheduleDeltaDays  = estimatedCompletionDate - expectedEndDate    (signed; negative = early)
predictedDelayDays = max(0, scheduleDeltaDays)
scheduleOutcome    = scheduleDeltaDays < 0 ? EARLY : scheduleDeltaDays == 0 ? ON_TRACK : DELAYED
```

The UI never renders a raw negative "delay" — `predictedDelayDays` is
always `>= 0`, and the accompanying `status` (`EARLY` / `ON_TRACK` /
`DELAYED`, plus `INSUFFICIENT_DATA`) is what the KPI cards and badges key
off of. `scheduleDeltaDays` (the signed value) is kept internally/for the
timeline visualization so "10 days early" can still be shown correctly.

## 8. Risk-score methodology ("Schedule Risk Score", 0–100)

Four factors, each scored 0–100 (0 = no concern, 100 = severe), combined
with **fixed, documented weights**:

| Factor | Weight | Derived from |
|---|---|---|
| Schedule variance | 30% | `deviation` thresholds: `>=0` → 10, `[-5, 0)` → 40, `[-15, -5)` → 65, `< -15` → 90 |
| Velocity adequacy | 30% | `velocityRatio` thresholds: `>=1.0` → 10, `[0.8, 1.0)` → 35, `[0.5, 0.8)` → 65, `<0.5` → 90 (plus explicit 10/50/90 fallbacks for the already-complete / rate-unknown / stalled cases) |
| Predicted schedule delta | 25% | `predictedDelayDays` as a fraction of the project's own total planned duration (`expectedEndDate - startDate`), scaled so a delay of 30%+ of the planned duration reaches 100 |
| Historical trend | 15% | The change in `deviation` across the most recent 3 actual-bearing records (needs ≥3 to distinguish from the single-step variance factor above) |

```
riskScore = round(0.30*variance + 0.30*velocity + 0.25*scheduleDelta + 0.15*trend)
```

Bands: **0–24 LOW, 25–49 MODERATE, 50–74 HIGH, 75–100 CRITICAL.**

Because every input above is derived only from the project's own stored
dates and progress records (nothing reads the wall clock), the same input
always produces the same `riskScore` — this determinism is explicitly unit
tested (`lib/services/delay-prediction.test.ts`).

## 9. Delay-probability heuristic ("Estimated Delay Probability", 0–100)

A **separate** deterministic heuristic, always labeled "Estimated Delay
Probability" in the UI — explicitly **not** a statistically validated
probability (no model was fit to historical outcome data; there is no
outcome dataset to fit one to). Uses three of the same four factor scores
above, with different weights and no completion-date term:

```
estimatedDelayProbability = round(0.40*variance + 0.40*velocity + 0.20*trend)
```

## 10. Data sufficiency

Describes how much historical evidence backs a prediction — explicitly
**not** a statistical confidence figure (never expressed as, e.g.,
"94.7%"):

| Actual-bearing progress records | Data sufficiency |
|---|---|
| 0–1 | `INSUFFICIENT` — no prediction is computed at all |
| 2 | `LIMITED` |
| 3–4 | `ADEQUATE` |
| 5+ | `STRONG` |

With 0 or 1 usable records, `status` is `INSUFFICIENT_DATA` and no
`riskScore`, `estimatedDelayProbability`, or completion date is computed —
only the real, already-recorded latest progress/planned/variance values
(if any) are surfaced, per the "never fabricate, show insufficient data
explicitly" rule.

## 11. YOLO11's role (secondary evidence only)

YOLO11 (`yolo11n.pt`, a generic COCO-pretrained 80-class detector — see
`docs/ai-pipeline.md`) is never an input to any formula above. The only
place it appears in delay prediction is an optional, clearly-labeled note
built by `buildAiEvidenceNote()`, which purely restates a factual
detection-count change between the earliest and latest analyzed images
(e.g. *"Total YOLO11 object detections across analyzed images increased
from 4 to 7 over 12 days. This is supporting visual evidence only — it is
not used in the risk score or delay projection above."*). A claim like
"increased worker count means the project is 12% ahead of schedule" is
never made anywhere in this system.

## 12. Limitations

- This is a rule-based analytical model, not a trained machine-learning
  forecaster — there is no learned relationship between historical
  projects and outcomes, because no such dataset exists for this academic
  project.
- The risk-score and delay-probability weights are reasoned, documented
  choices, not fitted/validated against real construction-project outcome
  data.
- Velocity is a simple two-point (earliest/latest) real-elapsed-time rate;
  it does not model seasonality, weekends, weather, or resourcing changes.
- YOLO11 evidence never contributes numerically to the prediction — this
  is a deliberate academic-integrity boundary, not an oversight.
- Predictions are computed dynamically on every read (see §14) rather than
  versioned/persisted — there is no immutable historical record of "what
  the system predicted on date X" beyond what can be reconstructed from
  the `ProgressRecord` history itself.

## 13. Worked example

Given: latest actual progress = 42%, latest planned progress = 51%,
observed velocity = 0.45%/day, required velocity = 0.68%/day.

```
deviation = 42 - 51 = -9                          (schedule variance)
remainingProgress = 100 - 42 = 58%
velocityRatio = 0.45 / 0.68 = 0.66                 ([0.5, 0.8) band -> velocity score 65)
varianceScore: deviation -9 is in [-15, -5) -> 65
estimatedRemainingDays = 58 / 0.45 ≈ 128.9 days
predictedCompletionDate ≈ latestProgressDate + 129 days
predictedDelayDays = max(0, predictedCompletionDate - expectedEndDate)
```

If, for this project, that projected completion date lands 18 days after
`expectedEndDate`: `predictedDelayDays = 18`, `status = "DELAYED"`. With,
say, a schedule-delta factor score of 60 (roughly 18 days against this
project's own planned duration) and a `STABLE` historical trend (score
50, assuming ≥3 actual-bearing records with no clear improving/worsening
pattern):

```
riskScore = round(0.30*65 + 0.30*65 + 0.25*60 + 0.15*50) = round(60) = 60  -> HIGH
estimatedDelayProbability = round(0.40*65 + 0.40*65 + 0.20*50) = round(62) = 62
```

## Persistence decision

The existing `DelayPrediction` Prisma model is a **one-to-one** relation
with a single `ProgressRecord` (`progressRecordId String @unique`) and
stores the per-record baseline's per-record output. The project-level delay engine's
result is **project-level** (derived from the whole progress history, not
one record) and changes shape whenever any record in that history changes
— it does not map onto that one-to-one model without either overloading
its meaning or a schema change.

Rather than adding a new, largely-redundant table purely to cache a value
that is cheap to recompute (a handful of arithmetic operations over
records already loaded for the page), the project-level delay engine is **computed
dynamically** on every read — both by `GET /api/delay-prediction` and, on
the project detail page itself, directly from the same pure function
(mirroring the existing `ProgressKpiCards` / `computeProgressSummary`
pattern used by progress analytics, avoiding a second network round-trip). The
existing `DelayPrediction` table and the per-record baseline it stores are
left completely untouched.

"Prediction history" (the design requirements) is reconstructed the same
way — `computeDelayPredictionHistory()` re-runs the deterministic engine
with an increasingly later `asOfDate` cutoff for each actual-bearing
progress record, so the sequence of past risk assessments is always
derivable from the real `ProgressRecord` history without any additional
persistence or versioning complexity.
