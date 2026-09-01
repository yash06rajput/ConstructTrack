import PDFDocument from "pdfkit";

import { formatDate, formatDateTime, formatPercent, formatSignedPercent } from "@/lib/format";
import { REPORT_DISCLAIMER_POINTS, REPORT_METHODOLOGY_SECTIONS } from "@/lib/reports/formatting";
import type { ReportData } from "@/lib/reports/types";

const PAGE_MARGIN = 50;
const COLORS = { heading: "#111827", muted: "#6b7280", rule: "#e5e7eb" };

function sectionHeading(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(1);
  doc
    .fillColor(COLORS.heading)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(title);
  doc
    .moveTo(PAGE_MARGIN, doc.y + 2)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y + 2)
    .strokeColor(COLORS.rule)
    .stroke();
  doc.moveDown(0.5).fillColor("#000000").font("Helvetica").fontSize(10);
}

function keyValueRow(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.font("Helvetica-Bold").fontSize(10).text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(value);
}

function bulletList(doc: PDFKit.PDFDocument, items: string[]) {
  for (const item of items) {
    doc.fontSize(9.5).text(`•  ${item}`, { indent: 4 });
    doc.moveDown(0.15);
  }
}

/**
 * A minimal, dependency-free table renderer for pdfkit (which has no
 * built-in table support). Column widths are fixed and content wraps
 * within them; a new page is started automatically by pdfkit when a row
 * would overflow the current one.
 */
function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], columnWidths: number[]) {
  const startX = PAGE_MARGIN;
  const rowHeight = 16;

  function drawRow(cells: string[], bold: boolean) {
    if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
    }
    let x = startX;
    const y = doc.y;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    cells.forEach((cell, index) => {
      doc.text(cell, x, y, { width: columnWidths[index], ellipsis: true });
      x += columnWidths[index];
    });
    doc.y = y + rowHeight;
  }

  drawRow(headers, true);
  doc
    .moveTo(startX, doc.y)
    .lineTo(startX + columnWidths.reduce((sum, w) => sum + w, 0), doc.y)
    .strokeColor(COLORS.rule)
    .stroke();
  doc.moveDown(0.2);
  for (const row of rows) {
    drawRow(row, false);
  }
}

/**
 * Renders a ReportData snapshot to a PDF buffer. Shares its section
 * content and wording with the web report view (lib/reports/formatting.ts)
 * so the two never drift apart. Textual/tabular by design — charts are
 * deliberately not embedded (see docs/reporting.md's PDF-limitations note)
 * to keep this reliable rather than fragile.
 */
export function generateReportPdf(report: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // --- Header ---------------------------------------------------------
    doc.font("Helvetica-Bold").fontSize(18).fillColor(COLORS.heading).text(report.header.reportTitle);
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(11).fillColor("#000000").text(`Project: ${report.header.projectName}`);
    doc.text(`Location: ${report.header.projectLocation ?? "Not specified"}`);
    doc.text(
      `Reporting Period: ${formatDate(report.header.reportingPeriodStart)} – ${formatDate(report.header.reportingPeriodEnd)}`,
    );
    doc.text(`Generated: ${formatDateTime(report.header.generatedAt)}`);
    doc.text(`Project Status: ${report.header.projectStatus}`);
    doc.fillColor(COLORS.muted).fontSize(9).text(
      `Project dates: ${formatDate(report.header.projectStartDate)} – ${formatDate(report.header.expectedEndDate)}`,
    );
    doc.fillColor("#000000");

    // --- Executive summary ----------------------------------------------
    sectionHeading(doc, "Executive Summary");
    const summary = report.executiveSummary;
    keyValueRow(doc, "Recorded Progress", formatPercent(summary.recordedProgress));
    keyValueRow(doc, "Planned Progress", formatPercent(summary.plannedProgress));
    keyValueRow(doc, "Variance", formatSignedPercent(summary.variance));
    keyValueRow(doc, "Schedule Status", summary.scheduleStatusLabel ?? "Insufficient data");
    keyValueRow(
      doc,
      "Progress Trend",
      summary.trendAvailable
        ? `${formatSignedPercent(summary.averageGainPerWeek)} per week`
        : `Unavailable — ${summary.trendReason ?? "insufficient data"}`,
    );
    doc.moveDown(0.3);
    if (summary.prediction.status === "INSUFFICIENT_DATA") {
      doc.font("Helvetica-Bold").text("Predicted Completion: Insufficient data");
      doc.font("Helvetica").fillColor(COLORS.muted).fontSize(9).text(
        "At least two progress updates with a recorded actual value are required before a schedule prediction can be computed.",
      );
      doc.fillColor("#000000");
    } else {
      keyValueRow(
        doc,
        "Predicted Completion",
        summary.prediction.estimatedCompletionDate ? formatDate(summary.prediction.estimatedCompletionDate) : "Unavailable",
      );
      keyValueRow(doc, "Expected Completion", formatDate(summary.prediction.expectedCompletionDate));
      keyValueRow(
        doc,
        "Predicted Delay",
        summary.prediction.predictedDelayDays !== null ? `${summary.prediction.predictedDelayDays} days` : "Unavailable",
      );
      keyValueRow(
        doc,
        "Estimated Delay Probability",
        summary.prediction.estimatedDelayProbability !== null ? `${summary.prediction.estimatedDelayProbability}%` : "Unavailable",
      );
      keyValueRow(
        doc,
        "Schedule Risk Score",
        summary.prediction.riskScore !== null
          ? `${summary.prediction.riskScore}/100 (${summary.prediction.riskLevel})`
          : "Unavailable",
      );
    }

    // --- Project overview -------------------------------------------------
    sectionHeading(doc, "Project Overview");
    const overview = report.projectOverview;
    keyValueRow(doc, "Description", overview.description ?? "Not provided");
    keyValueRow(doc, "Location", overview.location ?? "Not specified");
    keyValueRow(doc, "Start Date", formatDate(overview.startDate));
    keyValueRow(doc, "Expected End Date", formatDate(overview.expectedEndDate));
    keyValueRow(doc, "Status", overview.status);
    keyValueRow(doc, "Progress Records", String(overview.progressRecordCount));
    keyValueRow(doc, "Construction Images", String(overview.imageCount));
    keyValueRow(doc, "Analyzed Images", String(overview.analyzedImageCount));
    keyValueRow(
      doc,
      "Latest Progress Record",
      overview.latestProgressRecordDate ? formatDate(overview.latestProgressRecordDate) : "None recorded",
    );

    // --- Progress analytics / historical progress ------------------------
    sectionHeading(doc, "Progress Analytics");
    const current = report.progressAnalytics.current;
    if (!current.hasData) {
      doc.text("No progress records have been recorded for this project.");
    } else {
      keyValueRow(doc, "Latest Actual Progress", formatPercent(current.currentActual));
      keyValueRow(doc, "Latest Planned Progress", formatPercent(current.currentPlanned));
      keyValueRow(doc, "Deviation", current.varianceAvailable ? formatSignedPercent(current.variance) : "Not yet recorded");
      keyValueRow(doc, "Status", current.statusLabel ?? "Not available");
    }

    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(11).text("Historical Progress");
    doc.moveDown(0.2);
    if (report.progressAnalytics.history.length === 0) {
      doc.font("Helvetica").fontSize(10).text("No progress records have been recorded for this project.");
    } else {
      drawTable(
        doc,
        ["Date", "Planned", "Actual", "Variance", "Status"],
        report.progressAnalytics.history.map((record) => [
          formatDate(record.recordDate),
          formatPercent(record.plannedProgress),
          formatPercent(record.actualProgress),
          record.deviation !== null ? formatSignedPercent(record.deviation) : "—",
          record.status ?? "—",
        ]),
        [100, 90, 90, 90, 105],
      );
    }

    // --- Construction images ----------------------------------------------
    sectionHeading(doc, "Construction Image Summary");
    const images = report.imageSummary;
    keyValueRow(doc, "Total Images", String(images.totalImages));
    keyValueRow(doc, "Analyzed", String(images.analyzedImages));
    keyValueRow(doc, "Pending", String(images.pendingImages));
    keyValueRow(doc, "Failed", String(images.failedImages));
    doc.moveDown(0.3);
    if (images.timeline.length === 0) {
      doc.text("No construction images have been uploaded for this project.");
    } else {
      drawTable(
        doc,
        ["Uploaded", "Filename", "Status", "Detections"],
        images.timeline.map((entry) => [
          formatDate(entry.uploadedAt),
          entry.originalFilename,
          entry.analysisStatus,
          entry.totalDetections !== null ? String(entry.totalDetections) : "—",
        ]),
        [90, 175, 90, 90],
      );
    }
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text("AI object detections provide visual evidence only and do not directly represent construction completion percentage.");
    doc.fillColor("#000000");

    // --- AI computer-vision analysis --------------------------------------
    sectionHeading(doc, "AI Computer-Vision Analysis");
    const ai = report.aiAnalysis;
    if (!ai.available) {
      doc.text("AI analysis unavailable — no construction images have completed AI analysis.");
    } else {
      keyValueRow(doc, "Model", ai.modelVersion ?? "Unknown");
      keyValueRow(doc, "Analyzed Images", String(ai.analyzedImageCount));
      keyValueRow(doc, "Total Detections", ai.totalDetections !== null ? String(ai.totalDetections) : "—");
      keyValueRow(
        doc,
        "Average Confidence",
        ai.averageConfidence !== null ? `${(ai.averageConfidence * 100).toFixed(1)}%` : "Data unavailable",
      );
      keyValueRow(doc, "Unique Detected Classes", String(ai.uniqueClasses.length));
      doc.moveDown(0.3);
      if (ai.objectCounts.length > 0) {
        drawTable(
          doc,
          ["Object Class", "Count"],
          ai.objectCounts.map((row) => [row.className, String(row.count)]),
          [200, 100],
        );
      }
      if (ai.comparison) {
        doc.moveDown(0.4);
        doc.font("Helvetica-Bold").fontSize(10).text(
          `Detection Comparison (${formatDate(ai.comparison.earlierDate)} → ${formatDate(ai.comparison.laterDate)}, ${ai.comparison.daysBetween} days)`,
        );
        doc.moveDown(0.2);
        drawTable(
          doc,
          ["Object", "Earlier", "Later", "Change"],
          ai.comparison.rows.map((row) => [
            row.className,
            String(row.earlier),
            String(row.later),
            row.change > 0 ? `+${row.change}` : String(row.change),
          ]),
          [150, 80, 80, 80],
        );
      }
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text("Detections shown above are visual AI evidence, not a construction-progress measurement.");
      doc.fillColor("#000000");
    }

    // --- Delay prediction ---------------------------------------------------
    sectionHeading(doc, "Delay Prediction");
    const prediction = report.delayPrediction;
    if (prediction.status === "INSUFFICIENT_DATA") {
      doc.text(
        `Insufficient data — ${prediction.usableRecordCount} usable progress update${prediction.usableRecordCount === 1 ? "" : "s"} recorded. At least two are required.`,
      );
    } else {
      keyValueRow(doc, "Prediction Status", prediction.status);
      keyValueRow(
        doc,
        "Estimated Completion Date",
        prediction.estimatedCompletionDate ? formatDate(prediction.estimatedCompletionDate) : "Unavailable",
      );
      keyValueRow(doc, "Expected Completion Date", formatDate(prediction.expectedCompletionDate));
      keyValueRow(
        doc,
        "Predicted Delay (days)",
        prediction.predictedDelayDays !== null ? String(prediction.predictedDelayDays) : "Unavailable",
      );
      keyValueRow(
        doc,
        "Average Daily Progress",
        prediction.averageDailyProgress !== null ? `${prediction.averageDailyProgress}%/day` : "Unavailable",
      );
      keyValueRow(
        doc,
        "Average Weekly Progress",
        prediction.averageWeeklyProgress !== null ? `${prediction.averageWeeklyProgress}%/week` : "Unavailable",
      );
      keyValueRow(
        doc,
        "Required Daily Progress",
        prediction.requiredDailyProgress !== null ? `${prediction.requiredDailyProgress}%/day` : "Unavailable",
      );
      keyValueRow(doc, "Velocity Ratio", prediction.velocityRatio !== null ? String(prediction.velocityRatio) : "Unavailable");
    }
    keyValueRow(doc, "Data Sufficiency", prediction.dataSufficiency);

    // --- Risk analysis -------------------------------------------------------
    sectionHeading(doc, "Risk Analysis");
    if (prediction.riskScore === null || prediction.riskLevel === null) {
      doc.text("Risk score unavailable — insufficient historical progress data.");
    } else {
      doc.font("Helvetica-Bold").fontSize(16).text(`PROJECT RISK: ${prediction.riskScore} / 100  (${prediction.riskLevel})`);
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(10);
      keyValueRow(
        doc,
        "Estimated Delay Probability",
        prediction.estimatedDelayProbability !== null ? `${prediction.estimatedDelayProbability}%` : "Unavailable",
      );
      doc.moveDown(0.3);
      const factorEntries: [string, { value: unknown; explanation: string }][] = [
        ["Schedule Variance", prediction.factors.scheduleVariance],
        ["Progress Velocity", prediction.factors.progressVelocity],
        ["Schedule Feasibility", prediction.factors.scheduleFeasibility],
        ["Historical Trend", prediction.factors.historicalTrend],
      ];
      for (const [label, factor] of factorEntries) {
        doc.font("Helvetica-Bold").fontSize(9.5).text(label);
        doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted).text(factor.explanation);
        doc.fillColor("#000000").moveDown(0.2);
      }
    }
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(
        "Estimated Delay Probability is a deterministic heuristic indicator based on the project's available schedule variance, velocity, and historical trend. It is not a statistically validated probability model.",
      );
    doc.fillColor("#000000");

    // --- Methodology -----------------------------------------------------
    sectionHeading(doc, "Methodology");
    for (const section of REPORT_METHODOLOGY_SECTIONS) {
      doc.font("Helvetica-Bold").fontSize(10).text(section.title);
      doc.font("Helvetica");
      bulletList(doc, section.points);
      doc.moveDown(0.2);
    }

    // --- Limitations / disclaimer -----------------------------------------
    sectionHeading(doc, "Limitations & Disclaimer");
    bulletList(doc, REPORT_DISCLAIMER_POINTS);

    doc.end();
  });
}
