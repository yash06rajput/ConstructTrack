# Project Synopsis

## ConstructTrack — Automated Construction Progress Monitoring, Delay Prediction & Risk Reporting System

*Minor Project (ES-451) · Department of Information Technology · Maharaja Agrasen Institute of Technology, Delhi · Session 2026–27*

*Revised October 2026 (original synopsis submitted 1 September 2026).*

| Team 54 | Enrolment No. |
|---|---|
| Ashish Upadhyay | 06714803123 |
| Yash Rajput | 06814803123 |
| Sahil Rao | 07614803123 |

**Faculty guide:** Dr. Seema Kalonia

---

## 1. Abstract

Construction projects generate a continuous stream of progress information — planned-versus-actual schedule updates and periodic site photographs — that is often recorded manually and reviewed in a fragmented, ad hoc way. This project implements a web-based system that centralises that information for each construction project and layers three analytical capabilities on top of it.

First, uploaded construction-site images are analysed using a YOLO11 computer-vision object-detection model, producing structured detection results that are treated strictly as supporting visual evidence. Second, a progress-analytics engine compares recorded actual progress against the planned schedule and derives a real, elapsed-time-based historical trend from the project's own progress records. Third, a deterministic delay-prediction and risk-scoring engine projects a likely completion date, a predicted schedule delay and a documented, weighted 0–100 risk score from the same progress history, without claiming statistical or machine-learning accuracy that the data cannot support.

These layers are consolidated into an automated project report, generated entirely from server-side data and available as a printable web page and a downloadable PDF. The system keeps computer-vision output ("what objects were detected") separate from deterministic project metrics ("how complete is the project and how much schedule risk it carries") on every screen and in every report. The system is deployable on free cloud tiers. Its risk engine has been evaluated on structured scenarios against a deviation-only baseline and tested for sensitivity to its weights.

## 2. Problem Statement

Construction progress monitoring, as commonly practised, has several recurring weaknesses:

- Progress is tracked manually in spreadsheets or site-visit notes that are not centralised or easy to compare over time.
- Photographic evidence from site visits accumulates without a systematic way to organise it against the project timeline or against previous visits.
- Because progress figures and photographs are reviewed separately and irregularly, early signs of schedule slippage go unnoticed until they become significant.
- Producing a stakeholder progress report is a manual, time-consuming exercise of collecting numbers and images from several sources.

## 3. Proposed Solution

A single web application lets a project manager record structured progress observations and upload dated site images against one project, so the complete project history lives in one place. Each uploaded image can be analysed by an object-detection model, and the results are stored so that visual evidence accumulates over time instead of being reviewed once and discarded. A deterministic analytics engine, computed only from the project's own recorded dates and progress values, continuously re-evaluates schedule variance, progress velocity, predicted completion and a documented risk score, so a manager does not have to notice a slipping trend manually. A complete report covering progress history, visual evidence, delay prediction and risk can be generated and exported as a PDF in a single action, with every figure computed from the current database state.

## 4. Objectives

- Centralise a construction project's progress data in one system.
- Maintain a complete historical record of progress observations for each project.
- Capture and organise construction-site images against their project and, optionally, a specific progress record.
- Perform computer-vision-based visual analysis of construction images.
- Calculate progress analytics (current completion, variance against plan, historical trend) from recorded data.
- Estimate delay probability and a projected completion date from the project's own progress velocity.
- Calculate a documented, deterministic project risk score.
- Generate automated, structured project reports without manual data assembly, with a professional PDF export.
- Keep AI-derived visual evidence clearly separate from deterministic, server-calculated project metrics.

## 5. System Scope

**Implemented in the current system**

- Project creation, editing, deletion and a project-level detail view.
- Progress-record creation, editing and deletion, with automatically derived deviation and status.
- Construction-image upload with server-side content validation, private storage, gallery and timeline views, and optional linking of images to a progress record.
- YOLO11 object-detection analysis of uploaded images, with persisted structured results and annotated images.
- Progress analytics: current completion, variance and an elapsed-time historical trend, with an explicit "insufficient data" state.
- Deterministic delay prediction: estimated completion date, predicted delay in days and an "Estimated Delay Probability" heuristic.
- Weighted schedule-risk scoring (0–100) with LOW / MODERATE / HIGH / CRITICAL bands and factor-level explanations.
- Automated report generation from a single project identifier, stored as a structured snapshot, with a print-friendly web view and a server-generated PDF.
- A portfolio-level dashboard summarising all projects.
- Cloud deployment of the web application on Vercel and Supabase with automatic database migrations; the YOLO11 service is containerised with Docker and self-hosted, with a protected endpoint.
- Automated tests: 61 unit tests for the web application and 32 tests for the AI service.

**Out of scope for the current system (see Section 7)**

Authentication and multi-user access control, chart-embedded PDF reports, a formally benchmarked computer-vision accuracy evaluation, and a statistically fitted (rather than deterministic) delay-prediction model.

## 6. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui (Radix UI), Recharts |
| Backend | Next.js API routes, Zod request validation, Prisma ORM, PostgreSQL |
| Storage | Supabase Storage (private bucket, short-lived signed URLs) |
| AI / Computer vision | Python, FastAPI, YOLO11 (Ultralytics), OpenCV (headless), PyTorch, NumPy |
| Reporting | PDFKit (server-side PDF generation) |
| Testing | Node test runner (tsx), pytest, ESLint, TypeScript strict mode |
| Deployment | Vercel (web), Supabase (database and storage), Docker / self-hosted (AI service) |

## 7. Future Scope

- Authentication and multi-user, multi-organisation access control. The team has started this as BuildBridge, a multi-tenant version with organisations, roles, invitations and a tower → floor → stage progress model.
- Richer PDF reports with embedded charts.
- A formal detection-accuracy evaluation on a labelled construction-image dataset, and a construction-specific detection model.
- Calibrating the risk weights, or fitting a statistical delay-prediction model, once outcome data from completed projects is available.
- Automated notifications when a project enters a higher risk band.
- Integration with external project-management tools.

## 8. Current Status and Conclusion

As of October 2026, all objectives in Section 4 are implemented and working end to end, and the system is prepared for cloud deployment. The risk engine has been evaluated on structured scenarios, where it rated a slipping project HIGH while a deviation-only baseline rated it MEDIUM. It produces identical results on repeated runs and keeps the same ranking of projects under ±30% changes to its weights. A research paper describing the framework has been drafted in IEEE format.

The system centralises construction progress and image data, performs genuine computer-vision analysis while keeping it separate from deterministic project metrics, computes transparent delay and risk assessments from each project's own history, and produces professionally formatted reports without manual data assembly. Architecture and methodology are documented in the project repository: https://github.com/yash06rajput/ConstructTrack.
