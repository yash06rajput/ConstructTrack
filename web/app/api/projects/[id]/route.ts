import type { NextRequest } from "next/server";

import { withApiErrorHandling } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updateProjectSchema } from "@/lib/validation/project";
import { deleteProject, getProjectOrThrow, updateProject } from "@/lib/services/projects";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withApiErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const project = await getProjectOrThrow(id);
  return ok(project);
});

export const PATCH = withApiErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  const body = await request.json();
  const input = updateProjectSchema.parse(body);
  await getProjectOrThrow(id);
  const project = await updateProject(id, input);
  return ok(project);
});

export const DELETE = withApiErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { id } = await params;
  await getProjectOrThrow(id);
  await deleteProject(id);
  return ok({ id });
});
