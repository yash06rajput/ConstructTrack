import type { NextRequest } from "next/server";

import { withApiErrorHandling } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updateProgressRecordSchema } from "@/lib/validation/progress";
import { deleteProgressRecord, updateProgressRecord } from "@/lib/services/progress.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const PATCH = withApiErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const body = await request.json();
  const input = updateProgressRecordSchema.parse(body);
  const record = await updateProgressRecord(id, input);
  return ok(record);
});

export const DELETE = withApiErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const result = await deleteProgressRecord(id);
  return ok(result);
});
