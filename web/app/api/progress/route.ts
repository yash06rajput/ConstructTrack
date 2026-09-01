import type { NextRequest } from "next/server";

import { withApiErrorHandling } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { createProgressRecordSchema } from "@/lib/validation/progress";
import { createProgressRecord, listProgressRecords } from "@/lib/services/progress.service";
import { validationError } from "@/lib/api/errors";

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    throw validationError('Query parameter "projectId" is required.');
  }
  const records = await listProgressRecords(projectId);
  return ok(records);
});

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const input = createProgressRecordSchema.parse(body);
  const record = await createProgressRecord(input);
  return created(record);
});
