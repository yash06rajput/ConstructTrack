import type { NextRequest } from "next/server";

import { withApiErrorHandling } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getReportById } from "@/lib/services/reports";

export const GET = withApiErrorHandling(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  const report = await getReportById(id);
  return ok(report);
});
