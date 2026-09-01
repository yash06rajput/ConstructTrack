/**
 * Static report prose — methodology and limitations text. Shared verbatim
 * between the web report view and the PDF export so the two never drift
 * apart. None of this is derived from project data; it describes the
 * system, not any one project.
 */

export interface MethodologySection {
  title: string;
  points: string[];
}

export const REPORT_METHODOLOGY_SECTIONS: MethodologySection[] = [
  {
    title: "Data sources",
    points: [
      "Project, progress-record, and construction-image data are read directly from the application's PostgreSQL database.",
      "Object-detection results come from already-persisted YOLO11 inference runs (see docs/ai-pipeline.md) — nothing is re-derived or guessed.",
    ],
  },
  {
    title: "Computer vision",
    points: [
      "YOLO11n (Ultralytics), a generic COCO-pretrained 80-class object detector, performs the actual inference.",
      "OpenCV is used for image annotation; PyTorch/Ultralytics run the model itself.",
      "Detections are treated as supporting visual evidence only — never as a construction-progress measurement.",
    ],
  },
  {
    title: "Progress analytics",
    points: [
      "Planned vs. actual progress and schedule deviation reuse lib/services/progress.ts's computeDeviation() / computeProgressStatus().",
      "Historical trend and average weekly progress reuse lib/services/progress-analytics.ts's computeProgressTrend(), using real elapsed calendar time rather than an assumed weekly cadence.",
    ],
  },
  {
    title: "Delay prediction",
    points: [
      "Remaining progress is projected against observed historical velocity to estimate a completion date (lib/services/delay-prediction.ts).",
      "Predicted delay is the difference between that projected date and the project's own expected end date, floored at zero for display.",
      "A Schedule Risk Score and a separately-labeled Estimated Delay Probability are deterministic, documented weighted heuristics — not trained statistical models.",
    ],
  },
  {
    title: "Risk analysis",
    points: [
      "Risk factors: schedule variance, velocity adequacy, predicted schedule delta, and historical trend — the exact weighting documented in docs/delay-prediction.md is reused unchanged.",
      "The same inputs always produce the same risk score (deterministic; unit tested).",
    ],
  },
];

export const REPORT_DISCLAIMER_POINTS: string[] = [
  "YOLO11 is a general-purpose, COCO-pretrained object detector — it has no notion of construction stages, materials, or completion.",
  "Generic object detection does not directly measure construction completion percentage.",
  "AI detections shown in this report are supporting visual evidence only.",
  "All progress percentages are based on manually recorded progress data, not inferred from images.",
  "Estimated Delay Probability is a deterministic heuristic indicator based on the project's available schedule variance, velocity, and historical trend. It is not a statistically validated probability model.",
  "Delay and risk predictions depend on the amount of historical progress data available for this project.",
  "Insufficient historical data can prevent a reliable prediction — the system reports this explicitly rather than guessing.",
];

export function buildReportTitle(projectName: string): string {
  return `${projectName} — Construction Progress & Risk Report`;
}
