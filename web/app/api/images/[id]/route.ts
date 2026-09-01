import type { NextRequest } from "next/server";

import { withApiErrorHandling } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { deleteImage } from "@/lib/services/images";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const DELETE = withApiErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const result = await deleteImage(id);
  return ok(result);
});
