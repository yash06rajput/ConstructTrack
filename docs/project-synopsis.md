# Project Synopsis

## Automated Construction Progress Monitoring, Delay Prediction & Risk Reporting System

*(ConstructTrack)*

---

## 1. Abstract

Construction projects generate a continuous stream of progress information — planned-versus-actual schedule updates and periodic site photographs — that is often recorded manually and reviewed in a fragmented, ad hoc way. This project implements a web-based system that centralizes that information for a construction project and layers three analytical capabilities on top of it.

First, uploaded construction-site images are analyzed using a real YOLO11 computer-vision object-detection model, producing structured detection results that are treated strictly as supporting visual evidence. Second, a progress-analytics engine compares recorded actual progress against the planned schedule and derives a real, elapsed-time-based historical trend from a project's own progress records. Third, a deterministic delay-prediction and risk-scoring engine projects a likely completion date, a predicted schedule delay, and a documented, weighted 0–100 risk score from that same progress history — explicitly avoiding any unsupported statistical or machine-learning accuracy claim.

These three analytical layers are consolidated into an automated project report, generated entirely from server-side data and available both as a printable web page and as a downloadable PDF document. The system deliberately keeps computer-vision output ("what objects were detected") separate from deterministic project metrics ("how complete is this project, and how much schedule risk does it carry") throughout — a distinction maintained in every screen and report section that presents AI results.

## 2. Problem Statement

Construction progress monitoring, as commonly practiced, has several recurring weaknesses:

- Progress is often tracked manually, in spreadsheets or site-visit notes that are not centralized or easy to compare over time.
- Photographic evidence from site visits accumulates without a systematic way to organize it against the project timeline or against previous visits.
- Because progress and photographic evidence are reviewed separately and irregularly, early signs of schedule slippage can go unnoticed until they become significant.
- Producing a progress report for stakeholders is typically a manual, time-consuming exercise of collecting numbers and images from multiple sources.

## 3. Proposed Solution

The implemented system addresses each of these gaps directly. A single web application lets a project manager record structured progress observations and upload dated site images against one project record, so all project history lives in one place. Every uploaded image can be analyzed by a real object-detection model, and results are persisted so evidence accumulates automatically rather than being reviewed once and discarded. A deterministic analytics engine — computed from the project's own recorded dates and progress values, never a black-box model — continuously re-evaluates schedule variance, progress velocity, predicted completion, and a documented risk score, so a manager does not have to notice a slipping trend manually. Finally, a complete report — covering progress history, visual evidence, delay prediction, and risk — can be generated and exported as a PDF from a single action, with every figure in it computed from the current database state rather than assembled by hand.

## 4. Objectives

- Centralize a construction project's progress data in one system.
- Maintain a complete historical record of progress observations per project.
- Capture and organize construction-site images against their project and, optionally, a specific progress record.
- Perform computer-vision-based visual analysis of construction images.
- Calculate progress analytics (current completion, variance against plan, historical trend) from recorded data.
- Estimate delay probability and a projected completion date from a project's own progress velocity.
- Calculate a documented, deterministic project risk score.
- Generate automated, structured project reports without manual data assembly.
- Provide a professional PDF export of each report.
- Maintain a clear, consistent separation between AI-derived visual evidence and deterministic, server-calculated project metrics throughout the system.

## 5. System Scope

**Implemented in the current system:**

- Project creation, editing, deletion, and a project-level detail view.
- Progress-record creation, editing, and deletion, with automatically derived deviation and status.
- Construction-image upload (with server-side content validation), private storage, and a gallery view.
- Real YOLO11 object-detection analysis of uploaded images, with persisted structured results.
- Progress analytics: current completion, variance, and a real elapsed-time historical trend, including an explicit "insufficient data" state.
- Deterministic delay prediction: estimated completion date, predicted delay in days, and an "Estimated Delay Probability" heuristic.
- Deterministic, weighted schedule risk scoring (0–100) with LOW/MODERATE/HIGH/CRITICAL bands and factor-level explanations.
- Automated report generation from a single project identifier, persisted as a structured snapshot.
- A print-friendly web report view and a genuine, server-generated PDF export.
- A portfolio-level dashboard summarizing all projects.

**Explicitly out of scope for the current system** (see [Future Scope](#7-future-scope)): authentication and multi-user access control, chart-embedded PDF reports, a formally benchmarked computer-vision accuracy evaluation, and a statistically fitted (rather than deterministic/heuristic) delay-prediction model.

## 6. Technology Stack

**Frontend**
- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS, shadcn/ui (Radix UI primitives)
- Recharts

**Backend**
- Next.js API Routes, Zod request validation
- Prisma ORM
- PostgreSQL

**Storage**
- Supabase Storage (private bucket, short-lived signed URLs for construction images)

**AI / Computer Vision**
- Python, FastAPI
- YOLO11 (via the Ultralytics library)
- OpenCV (headless), PyTorch, NumPy, Pandas

**Reporting**
- PDFKit (server-side PDF generation)

## 7. Future Scope

- Authentication and multi-user, multi-tenant access control.
- Richer PDF reports with embedded charts.
- A formal detection-accuracy evaluation against a larger, labeled construction-image dataset.
- A statistically fitted delay-prediction model, once sufficient historical outcome data is available.
- Automated notifications/alerts for newly at-risk projects.
- Integration with external project-management tools.

## 8. Conclusion

The system fulfils its stated objectives: it centralizes construction progress and image data, performs genuine computer-vision analysis while keeping that analysis clearly separated from deterministic project metrics, computes transparent, deterministic delay and risk assessments from a project's own history, and produces automated, professionally formatted reports without manual data assembly. Its architecture and methodology are documented in full elsewhere in this repository (see `README.md` and the `docs/` directory) for evaluation, extension, or further academic review.
