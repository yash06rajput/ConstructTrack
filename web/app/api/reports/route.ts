import type { NextRequest } from "next/server";

import { withApiErrorHandling } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { generateReportSchema } from "@/lib/validation/report";
import { generateReport, listAllReports, listReports } from "@/lib/services/reports";

/**
 * GET /api/reports              -> every report, across all projects (the top-level /reports page)
 * GET /api/reports?projectId=.. -> reports for one project only
 */
export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const projectId = request.nextUrl.searchParams.get("projectId");
  const reports = projectId ? await listReports(projectId) : await listAllReports();
  return ok(reports);
});

/**
 * POST /api/reports — generates a new report for a project. The client
 * submits only `projectId`; every value in the generated report (progress,
 * images, AI evidence, delay prediction, risk score) is retrieved and
 * computed server-side from the database. See lib/services/reports.ts.
 */
export const POST = withApiErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const input = generateReportSchema.parse(body);
  const report = await generateReport(input);
  return created(report);
});
