import { prisma } from "@/lib/db";
import { notFound } from "@/lib/api/errors";
import { getOrCreateDefaultManager } from "@/lib/services/users";
import type { CreateProjectInput, UpdateProjectInput } from "@/lib/validation/project";

/**
 * Projects list, enriched with just enough data for the /projects cards:
 * counts, plus the single most recent ProgressRecord (if any) so the UI
 * can show "current completion" without fetching full history per project.
 */
export function listProjects() {
  return prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { progressRecords: true, images: true, reports: true } },
      progressRecords: {
        orderBy: { recordDate: "desc" },
        take: 1,
      },
    },
  });
}

export type ProjectListItem = Awaited<ReturnType<typeof listProjects>>[number];

export async function getProjectOrThrow(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      progressRecords: { orderBy: { recordDate: "asc" } },
      _count: { select: { images: true, reports: true } },
    },
  });
  if (!project) throw notFound("Project", id);
  return project;
}

export type ProjectDetail = Awaited<ReturnType<typeof getProjectOrThrow>>;

export async function createProject(input: CreateProjectInput) {
  const managerId = input.managerId ?? (await getOrCreateDefaultManager()).id;

  return prisma.project.create({
    data: {
      name: input.name,
      description: input.description || undefined,
      location: input.location || undefined,
      status: input.status,
      startDate: input.startDate,
      expectedEndDate: input.expectedEndDate,
      managerId,
    },
  });
}

export function updateProject(id: string, input: UpdateProjectInput) {
  return prisma.project.update({
    where: { id },
    data: {
      ...input,
      description: input.description === "" ? null : input.description,
      location: input.location === "" ? null : input.location,
    },
  });
}

/**
 * Counts of records that would block a simple delete (Project's relations
 * use onDelete: Cascade for progress/images/delay/reports, so deleting a
 * project always succeeds at the DB level — but we still want the user to
 * make an informed choice, since cascade delete removes that history too).
 */
export async function getProjectDependentCounts(id: string) {
  const [progressRecords, images, reports] = await Promise.all([
    prisma.progressRecord.count({ where: { projectId: id } }),
    prisma.constructionImage.count({ where: { projectId: id } }),
    prisma.report.count({ where: { projectId: id } }),
  ]);
  return { progressRecords, images, reports };
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } });
}
