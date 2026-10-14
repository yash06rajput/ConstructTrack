import type { NextRequest } from "next/server";

import { toErrorResponse } from "@/lib/api/handler";
import { getReportById } from "@/lib/services/reports";
import { generateReportPdf } from "@/lib/reports/pdf";
import type { ReportData } from "@/lib/reports/types";

// pdfkit needs Node APIs (Buffer/streams) — explicit, not the Edge runtime.
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/reports/[id]/pdf — streams a PDF built from the report's
 * already-persisted `reportData` snapshot. Not routed through
 * withApiErrorHandling itself, since a binary PDF response isn't JSON —
 * but every failure path (report lookup AND PDF rendering) is still
 * mapped through the same `toErrorResponse` the rest of the API uses, so
 * a rendering failure here returns the standard
 * `{success:false,error:{code,message}}` envelope instead of leaking a
 * generic Next.js error page or a stack trace.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const report = await getReportById(id);
    const pdfBuffer = await generateReportPdf(report.reportData as unknown as ReportData);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${report.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
