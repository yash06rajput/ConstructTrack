# ConstructTrack — Automated Construction Progress Monitoring, Delay Prediction & Risk Reporting System

A web-based system for tracking construction-site progress from real project data and site photographs, analyzing that photographic evidence with computer vision, and turning the combined data into schedule-risk predictions and professional progress reports.

## Overview

ConstructTrack centralizes the day-to-day information a construction project manager already collects — planned vs. actual progress updates and periodic site photographs — and layers three analytical capabilities on top of it:

- **Computer-vision analysis** of uploaded construction images using a YOLO11 object-detection model, kept explicitly as supporting visual evidence rather than a measure of completion.
- **Progress analytics** that compare recorded progress against the planned schedule and compute a real, elapsed-time-based trend.
- **Delay prediction and risk scoring** that projects a likely completion date and a documented, deterministic 0–100 schedule-risk score from the project's own historical progress records.

All of this is consolidated into an automated project report — viewable on the web, printable, and exportable as a PDF — built entirely from server-calculated values. No metric shown anywhere in the system is accepted from client input; every progress percentage, risk score, or predicted date is computed from the database on the server.

The system consists of two independently run services: a Next.js application (UI, API, database access) and a Python FastAPI service (YOLO11 inference).

For a formal project synopsis (abstract, problem statement, objectives, scope), see [`docs/project-synopsis.md`](docs/project-synopsis.md).

## Features

- **Project management** — create, edit, and track construction projects with a planned schedule (start date, expected end date), status, and location.
- **Progress tracking** — record periodic planned-vs-actual progress observations, with automatically derived deviation and status (ahead / on track / at risk / delayed).
- **Construction image management** — upload site photographs (JPEG/PNG/WEBP), organized by project and optionally linked to a specific progress record, stored in Supabase Storage and served via short-lived signed URLs.
- **Computer-vision analysis** — run real YOLO11 object detection on an uploaded image and persist the structured result (detected objects, confidence scores, an annotated image).
- **Progress analytics** — current completion, planned-vs-actual variance, and a real elapsed-time progress trend, computed from the project's own recorded history.
- **Delay prediction** — an estimated completion date, a predicted delay in days, and an "Estimated Delay Probability" heuristic, all clearly labeled as deterministic (not machine-learned) estimates, with explicit "insufficient data" handling.
- **Risk analysis** — a documented, weighted 0–100 "Schedule Risk Score" with LOW / MODERATE / HIGH / CRITICAL bands and factor-level explanations.
- **Automated reporting** — a structured project report (executive summary, progress history, image summary, AI evidence, delay prediction, risk analysis, methodology, limitations) generated from a single `projectId`.
- **PDF export** — a genuine, server-rendered PDF version of the same report.
- **Dashboard** — a portfolio-level view of total/active projects, average completion, and at-risk project counts.

## System Workflow

```text
Create Project
      ↓
Record Progress
      ↓
Upload Construction Images
      ↓
Run AI Analysis
      ↓
Review Progress Analytics
      ↓
Review Delay Prediction
      ↓
Review Risk Analysis
      ↓
Generate Report
      ↓
View / Print / Download PDF
```

1. **Create Project** — register a project with its name, location, planned start date, and expected end date.
2. **Record Progress** — log a periodic planned-vs-actual progress observation; deviation and status are derived automatically.
3. **Upload Construction Images** — attach dated site photographs to the project, optionally tied to a specific progress record.
4. **Run AI Analysis** — trigger YOLO11 object detection on an image; results (detected objects, counts, confidence) are persisted.
5. **Review Progress Analytics** — see current completion, variance against plan, and the historical trend computed from real elapsed time between records.
6. **Review Delay Prediction** — see the estimated completion date, predicted delay, and delay-probability heuristic derived from the project's own progress velocity.
7. **Review Risk Analysis** — see the 0–100 schedule risk score, its risk band, and the underlying factor explanations.
8. **Generate Report** — request a report for the project; every value in it is computed server-side from the current database state.
9. **View / Print / Download PDF** — review the report on the web (print-friendly), or download it as a PDF.

## Architecture

```text
                    Construction Project
                           │
                           ▼
                  Project & Progress Data
                           │
                           ▼
                  Construction Images
                           │
                           ▼
                    AI / YOLO11 Analysis
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       Visual Evidence           Stored Analysis
              │                         │
              └────────────┬────────────┘
                           ▼
                  Progress Analytics
                           │
                           ▼
                  Delay Prediction
                           │
                           ▼
                     Risk Analysis
                           │
                           ▼
                    Report Builder
                      │         │
                      ▼         ▼
                 Web Report    PDF Report
```

Two independently deployable services:

- **`web/`** — Next.js 15 (App Router) application. Owns the UI, the API routes, database access (via Prisma), and Supabase Storage integration. Calls the AI service over plain HTTP and never runs Python itself.
- **`ai-service/`** — FastAPI application. Owns image preprocessing and YOLO11 inference. Stateless: it receives a short-lived signed image URL and returns structured detection JSON; it never talks to PostgreSQL or Supabase directly.

Within `web/`, data flows through a consistent layering: API routes validate input (Zod) and delegate to service functions; service functions perform the database work and call pure, independently-tested analytics engines (progress analytics, delay prediction, report composition); the report builder never recalculates a value those engines already produce, and the web report and PDF export both render the same underlying `ReportData` snapshot.

## Screenshots

The screenshots below are the recommended, minimal set to demonstrate the complete workflow — they are not yet included in this repository and need to be captured from a running instance with representative demo data (see [Getting Started](#getting-started)). Once captured, save each file at the path shown and it will render inline.

| Screenshot | Path | What it should show |
|---|---|---|
| Dashboard | `docs/screenshots/01-dashboard.png` | Portfolio stat cards (total/active projects, average completion, at-risk count) and the recent-projects table, populated with real project data. |
| Projects list | `docs/screenshots/02-projects-list.png` | The project cards/table with meaningful names, statuses, and completion values. |
| Project detail | `docs/screenshots/03-project-detail.png` | Project header/info plus navigation into progress, images, AI analysis, delay prediction, and reports. |
| Progress tracking | `docs/screenshots/04-progress-tracking.png` | Progress KPI cards, the planned-vs-actual chart, and the historical progress table. |
| Construction images | `docs/screenshots/05-construction-images.png` | The image gallery with upload dates and analysis status, in a populated (non-empty) state. |
| AI analysis | `docs/screenshots/06-ai-analysis.png` | A completed analysis result — detected objects, confidence values, and the "visual evidence only" labeling. |
| Delay prediction | `docs/screenshots/07-delay-prediction.png` | Estimated completion date, predicted delay, data-sufficiency label, and supporting KPI cards. |
| Risk analysis | `docs/screenshots/08-risk-analysis.png` | The schedule risk score, its risk band, and the factor-level explanations. |
| Reports list | `docs/screenshots/09-reports-list.png` | The generated-reports table with title, generation date, and View/Download actions. |
| Report detail | `docs/screenshots/10-report-detail.png` | Enough of the web report (header through methodology/limitations) to show it is a complete, professional document. |
| PDF report | `docs/screenshots/11-pdf-report.png` | The actual exported PDF file opened in a PDF viewer — not a screenshot of the HTML report. |

See [`docs/screenshots/README.md`](docs/screenshots/README.md) for the full naming convention and capture notes.

## AI/ML Pipeline

Construction images are analyzed by a real YOLO11 (Ultralytics) object-detection model running in the Python AI service — this is genuine inference, not a simulated or hard-coded result. The pipeline:

1. The web app generates a short-lived, signed URL for the uploaded image (never a permanent one, and no storage credentials leave the Next.js server).
2. The AI service downloads the image, decodes and validates it (magic-byte sniffing, not just `Content-Type`), and resizes it for inference.
3. YOLO11 runs real object detection and returns detected objects, per-detection confidence and bounding boxes, and aggregate object counts.
4. The result is persisted against the image (`AIAnalysis`), and an annotated copy of the image (with detection boxes drawn) is optionally stored alongside the original.

**What this analysis is, and is not.** YOLO11 here is a general-purpose, COCO-pretrained detector — it recognizes common object classes (people, vehicles, equipment, and similar), not construction-specific concepts such as "wall completed" or "roof installed." Detected-object counts are treated throughout the system as **visual evidence only**: they are shown alongside progress data for a human reviewer's context, but they never feed into, or are converted into, a construction-completion percentage, a progress metric, or the delay/risk calculations described below. Every screen and report section that displays AI detections carries an explicit label to that effect.

No formal accuracy benchmark (precision/recall against labeled construction-site data) exists for this deployment — YOLO11's published performance is a general-purpose COCO benchmark, not a construction-specific one, and no such claim is made by this system.

Full pipeline details are documented in [`docs/ai-pipeline.md`](docs/ai-pipeline.md).

## Progress Analytics

Progress analytics are computed from a project's own recorded `ProgressRecord` history (planned and actual progress percentages, recorded per observation date). For each project, the system calculates:

- **Current completion** — the most recent recorded actual and planned progress values.
- **Variance** — `actualProgress − plannedProgress` on the latest record, and a derived status (ahead / on track / at risk / delayed).
- **Historical trend** — an average progress gain over real elapsed calendar time between the earliest and latest records with a recorded actual value (not an assumed weekly cadence).

With fewer than two progress records carrying an actual value, the trend is reported as unavailable with an explicit reason rather than an estimated number. Historical results are presented as a chronological table (date, planned, actual, variance, status) and a planned-vs-actual line chart.

See [`docs/progress-monitoring.md`](docs/progress-monitoring.md) for the full methodology.

## Delay Prediction & Risk Analysis

Delay prediction and risk scoring are computed by a single, deterministic, rule-based engine — there is no trained machine-learning model behind these numbers, and this is stated explicitly wherever they are shown. Using a project's own schedule dates and progress-record history, the engine computes:

- **Estimated completion date** — projected from the real elapsed-time progress velocity between recorded updates.
- **Predicted delay (days)** — the gap between the estimated and expected completion dates, always reported as a non-negative value alongside a separate schedule outcome (early / on track / delayed).
- **Estimated Delay Probability** — a documented, weighted heuristic (schedule variance, velocity, and historical trend), explicitly labeled as a deterministic indicator, not a statistically validated probability model.
- **Schedule Risk Score** — a documented, weighted 0–100 score (schedule variance, velocity adequacy, predicted schedule delta, and historical trend), banded as LOW (0–24) / MODERATE (25–49) / HIGH (50–74) / CRITICAL (75–100).
- **Data sufficiency** — INSUFFICIENT / LIMITED / ADEQUATE / STRONG, based on how many usable progress records back the prediction. With fewer than two usable records, no prediction, risk score, or completion date is computed at all — the system reports insufficient data rather than a guess.

YOLO11 detection counts, where available, appear only as an optional, clearly-labeled factual note (e.g. a detection-count change between two analyzed images) — they are never an input to the risk score or delay projection. The full methodology, including the exact weighting formulas and a worked example, is documented in [`docs/delay-prediction.md`](docs/delay-prediction.md).

## Automated Reporting

A report is generated from a single request containing only a `projectId` — every value inside it (progress figures, image/analysis counts, delay prediction, risk score) is retrieved from the database and computed server-side by the same progress-analytics and delay-prediction engines described above; the client can never submit a calculated metric. Each report is persisted as a structured snapshot (`Report.reportData`), so the report history for a project reflects what the system actually reported at that point in time. Reports can be viewed as a formatted web page (print-friendly), and downloaded as a genuine PDF built with PDFKit, containing the same sections in the same order — report header, executive summary, project overview, progress analytics and history, construction image summary, AI computer-vision analysis, delay prediction, risk analysis, methodology, and limitations/disclaimer. The PDF is text/table-based; it does not currently embed the progress chart. See [`docs/reporting.md`](docs/reporting.md) for the full report architecture.

## Technology Stack

**Frontend**
- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS, shadcn/ui component primitives (Radix UI)
- Recharts (progress and AI-detection charts)

**Backend**
- Next.js API Routes (REST-style JSON, Zod request validation)
- Prisma ORM
- PostgreSQL

**Storage**
- Supabase Storage (construction image binaries, private bucket, short-lived signed URLs)

**AI / Computer Vision**
- Python, FastAPI
- YOLO11 via Ultralytics
- OpenCV (headless), PyTorch, NumPy, Pandas

**Reporting**
- PDFKit (server-side PDF generation)

## Project Structure

```text
web/                        Next.js application
├── app/
│   ├── (dashboard)/         Dashboard, projects, reports pages (App Router)
│   └── api/                 API routes: projects, progress, images, analysis,
│                             delay, delay-prediction, reports (+ PDF)
├── components/
│   ├── ui/                   shadcn/ui primitives
│   ├── layout/                App shell (sidebar, header, nav)
│   ├── projects/               Project detail sections (progress, delay
│   │                            prediction, reports, status badges, ...)
│   └── reports/                 Report view, PDF/print controls, report tables
├── lib/
│   ├── api/                    Shared API error/response helpers
│   ├── validation/               Zod schemas per resource
│   ├── services/                  Business logic and database access
│   ├── serializers/                Plain, JSON-safe response shapes
│   ├── reports/                     Report data contract, formatting, PDF renderer
│   └── supabase/                     Supabase Storage client (server-only)
├── prisma/
│   ├── schema.prisma                 Database schema
│   └── seed.ts                        Demo data seeder
└── package.json

ai-service/                 Python FastAPI service
├── app/
│   ├── main.py               App entrypoint, CORS, router registration
│   ├── api/routes/            HTTP route handlers
│   ├── services/                Image preprocessing / YOLO11 inference / aggregation
│   ├── models/                   Pydantic request/response schemas
│   └── utils/                     Timing helper, typed errors
├── tests/                    pytest tests
└── requirements.txt

docs/                        Architecture, methodology, and synopsis documentation
├── project-synopsis.md
├── ai-pipeline.md
├── progress-monitoring.md
├── delay-prediction.md
├── reporting.md
└── screenshots/

.env.example                 Root environment variable reference
```

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Python 3.10+
- A PostgreSQL database (local, or hosted)
- A Supabase project (for Storage)

### Installation

```bash
# Frontend / backend (Next.js app)
cd web
npm install

# AI service (Python)
cd ../ai-service
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables

Copy the root example and fill in real values in `web/.env` (never commit real credentials):

```bash
cp .env.example web/.env
```

```env
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_SERVICE_URL=
```

- `DATABASE_URL` — PostgreSQL connection string.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project settings; safe to expose to the browser.
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only; never exposed to the browser or committed.
- `AI_SERVICE_URL` — base URL of the running AI service (e.g. `http://localhost:8000` in local development).

A Supabase Storage bucket named exactly `construction-images` must also exist (created manually in the Supabase dashboard), kept **private** — images are served only via short-lived signed URLs.

### Database Setup

`DATABASE_URL` must point at a real, reachable PostgreSQL server before
running the commands below — Prisma does not create the server itself,
only the schema inside it. If you don't already have a PostgreSQL server
for local development, the quickest path on macOS is Homebrew:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb construction_progress
```

Then set `DATABASE_URL` in `web/.env` to match, using your local macOS
username (Homebrew's default Postgres has no password for local
connections):

```env
DATABASE_URL="postgresql://YOUR_MACOS_USERNAME@localhost:5432/construction_progress?schema=public"
```

(Any other local install, Postgres.app, Docker, or a hosted provider works
the same way — just make sure `DATABASE_URL` matches a database that
actually exists and is reachable.)

Once the database exists and `DATABASE_URL` is correct:

```bash
cd web
npm run db:generate    # generates the Prisma Client
npm run db:migrate     # creates tables from prisma/schema.prisma
npm run db:seed        # loads demo projects and progress history
```

### AI Service Setup

```bash
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

The interactive API docs are then available at `http://localhost:8000/docs`.

### Running the Application

```bash
cd web
npm run dev
```

Open `http://localhost:3000`.

## API Overview

All routes return a consistent JSON envelope: `{ "success": true, "data": ... }` on success, or `{ "success": false, "error": { "code", "message" } }` on failure.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/projects` | List all projects with summary counts. |
| `POST` | `/api/projects` | Create a project. |
| `GET` | `/api/projects/:id` | Get full project detail, including progress history. |
| `PATCH` | `/api/projects/:id` | Update a project. |
| `DELETE` | `/api/projects/:id` | Delete a project (cascades its progress, images, and reports). |
| `GET` | `/api/progress?projectId=` | List a project's progress records. |
| `POST` | `/api/progress` | Create a progress record (deviation/status derived server-side). |
| `PATCH` | `/api/progress/:id` | Update a progress record. |
| `DELETE` | `/api/progress/:id` | Delete a progress record. |
| `GET` | `/api/images?projectId=` | List a project's construction images with signed URLs. |
| `POST` | `/api/images` | Upload a construction image (`multipart/form-data`: `file`, `projectId`, optional `progressRecordId`). |
| `DELETE` | `/api/images/:id` | Delete an image (storage object + database record). |
| `GET` | `/api/analysis?constructionImageId=` | Get the current AI-analysis status/result for one image. |
| `POST` | `/api/analysis` | Run YOLO11 analysis on an already-uploaded image. |
| `GET` | `/api/delay-prediction?projectId=` | Get the current delay prediction and schedule risk assessment for a project. |
| `GET` | `/api/reports?projectId=` | List reports (optionally scoped to a project). |
| `POST` | `/api/reports` | Generate a new report (`{ "projectId": "..." }` — no other field is accepted). |
| `GET` | `/api/reports/:id` | Get one report's full stored snapshot. |
| `GET` | `/api/reports/:id/pdf` | Download that report as a PDF file. |

## Testing

The following commands were run against the final implementation:

```text
npm run test                    → 61/61 passing
npx tsc --noEmit                → 0 errors
npx eslint .                    → 0 errors
npm run build                   → passed
pytest -q                       → 32/32 passing
python -m compileall app tests  → passed
```

Frontend/backend logic (progress analytics, delay prediction, risk scoring, report composition, PDF generation) is covered by `node:test` unit tests co-located with the code under `web/lib/`. The AI service is covered by `pytest` under `ai-service/tests/`.

## Security Considerations

- The client can never submit a calculated metric (progress percentage, risk score, delay probability, predicted completion date, or detected-object counts) — every such value is computed server-side from the database on every request.
- The Supabase service-role key, database credentials, and AI-service internals are never exposed to the browser, in API responses, in report data, or in error messages.
- Construction images are stored in a private Supabase Storage bucket and served only via short-lived signed URLs, never a permanent public link.
- Uploaded files are validated server-side by content (magic-byte sniffing), not by trusted filename/`Content-Type`.
- API error responses follow one consistent, generic envelope — internal errors (database, unexpected exceptions) never leak stack traces, SQL details, or filesystem paths to the client.

## Known Limitations

- **No authentication or multi-tenancy** — the system currently operates as a single-tenant application; this is a deliberate, documented scope decision, not an oversight.
- **PDF export is text/table-based** — it does not embed the progress chart; embedding charts reliably in the current PDF pipeline was judged not worth the added complexity for this project's scope.
- **No formal ML accuracy benchmark** — YOLO11 is used as a general-purpose, pretrained detector; no construction-specific precision/recall evaluation has been performed.
- **Delay probability is a heuristic, not a statistical model** — it is a documented, deterministic weighting of schedule variance, velocity, and trend, not a model fitted to historical construction-outcome data (no such dataset exists for this project).
- **Prisma CLI generation/validation** can depend on network access to Prisma's binary distribution servers in some development environments; this does not affect the application's runtime behavior once the Prisma Client is generated.

## Future Scope

- Authentication and multi-user, multi-tenant access control.
- Richer PDF reports with embedded charts.
- Evaluation against a broader, labeled construction-image dataset, and a formal detection-accuracy benchmark.
- A statistically fitted delay-prediction model, once sufficient historical outcome data exists.
- Notifications/alerts for newly at-risk projects.
- Integration with external project-management tools.

## Project Status

The system is feature-complete for its defined scope: project and progress management, construction image handling, YOLO11-based computer-vision analysis, progress analytics, delay prediction, risk analysis, and automated web/PDF reporting are all implemented, tested, and integrated end-to-end.

## License

This project was developed as an academic minor project. No open-source license has been applied; all rights are retained by the author unless a license is added.
