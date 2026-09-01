import type { NextRequest } from "next/server";

import { withApiErrorHandling } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { createProjectSchema } from "@/lib/validation/project";
import { createProject, listProjects } from "@/lib/services/projects";

export const GET = withApiErrorHandling(async () => {
  const projects = await listProjects();
  return ok(projects);
});

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const input = createProjectSchema.parse(body);
  const project = await createProject(input);
  return created(project);
});
