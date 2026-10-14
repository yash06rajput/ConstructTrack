import { prisma } from "@/lib/db";

/**
 * No authentication exists yet (listed under future scope). Projects still
 * require a `managerId` in the schema, so until real accounts exist we
 * resolve a single demo "Project Manager" user — reusing whichever user the
 * seed script already created, or creating one on first use. This keeps
 * the schema honest (every project has a real owner) without inventing a
 * fake multi-user system.
 */
export async function getOrCreateDefaultManager() {
  const existing = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      name: "Project Manager",
      email: "pm@constructtrack.dev",
    },
  });
}
