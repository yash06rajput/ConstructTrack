# Screenshot assets

This directory holds the screenshot set referenced from the main
[`README.md`](../../README.md). The files were captured from the live deployment (seeded demo data). `06-ai-analysis.png`
is added once an image has been analysed with the self-hosted YOLO11 service.

## Naming convention

Lowercase, kebab-case, numerically prefixed to fix the display order:

```text
docs/screenshots/
├── 01-dashboard.png
├── 02-projects-list.png
├── 03-project-detail.png
├── 04-progress-tracking.png
├── 05-construction-images.png
├── 06-ai-analysis.png
├── 07-delay-prediction.png
├── 08-risk-analysis.png
├── 09-reports-list.png
├── 10-report-detail.png
└── 11-pdf-report.png
```

## What each screenshot should show

| File | What to capture |
|---|---|
| `01-dashboard.png` | The dashboard: stat cards (total/active projects, average completion, at-risk count) and the recent-projects table, in a populated state — not an empty/first-run dashboard. |
| `02-projects-list.png` | The `/projects` list/grid with several projects showing meaningful names, statuses, and completion values. |
| `03-project-detail.png` | A single project's detail page: project info at the top, with the progress, images, AI analysis, delay prediction, and reports sections visible (or their entry points, if the page requires scrolling). |
| `04-progress-tracking.png` | The progress section: KPI cards (actual/planned/variance/trend), the planned-vs-actual chart, and the historical progress table. |
| `05-construction-images.png` | The construction-image gallery for a project with multiple uploaded images, showing upload dates and analysis status — a populated gallery, not an empty state. |
| `06-ai-analysis.png` | A single image's completed AI-analysis result: detected objects, per-detection confidence, and the "visual evidence only" labeling that accompanies it. |
| `07-delay-prediction.png` | The delay-prediction section for a project with sufficient data: estimated completion date, predicted delay, data-sufficiency label, and the supporting KPI cards. |
| `08-risk-analysis.png` | The schedule risk score and its LOW/MODERATE/HIGH/CRITICAL band, plus the factor-level explanations. |
| `09-reports-list.png` | The `/reports` page: the generated-reports table with titles, generation dates, and the View/Download actions. |
| `10-report-detail.png` | A generated report's web view — capture enough of the page (header through methodology/limitations, scrolling if needed) to show it is a complete, professional document. |
| `11-pdf-report.png` | The actual downloaded PDF file **opened in a PDF viewer** (e.g. the browser's built-in PDF viewer, Preview, or Adobe Reader) — not a screenshot of the HTML web report. |

## Guidance

- Use realistic demo data (the seed script in `web/prisma/seed.ts`, or your own test project) rather than placeholder/lorem-ipsum content — the point of the screenshot set is to demonstrate that the system works on real data.
- Prefer a small, purposeful set over an exhaustive one; the eleven screenshots above are intended to tell the complete story from project creation through PDF export, not to document every page.
- Crop to the relevant content area; a full, unscaled browser screenshot with excess browser chrome is acceptable but not necessary.
