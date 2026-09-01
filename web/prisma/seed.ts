/**
 * Development/demo seed data.
 *
 * This is NOT production data. It exists purely so the dashboard (built in
 * a later prompt) has realistic-looking projects and progress history to
 * render immediately. Run with: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import { computeDeviation, computeProgressStatus } from "../lib/services/progress";
import { estimateDelay } from "../lib/services/delay-prediction";

const prisma = new PrismaClient();

function weeksAfter(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

interface SeedProject {
  name: string;
  description: string;
  location: string;
  startDate: Date;
  expectedEndDate: Date;
  // [plannedProgress, actualProgress][] — one entry per week, from project start.
  weeklyProgress: [number, number][];
}

async function main() {
  console.log("Seeding demo data...");

  const manager = await prisma.user.upsert({
    where: { email: "pm@constructtrack.dev" },
    update: {},
    create: {
      name: "Asha Verma",
      email: "pm@constructtrack.dev",
    },
  });

  const today = new Date();
  const projectStart = new Date(today);
  projectStart.setDate(projectStart.getDate() - 21); // 3 weeks of history

  const seedProjects: SeedProject[] = [
    {
      name: "Commercial Office Building",
      description:
        "8-storey commercial office building with basement parking, steel-and-glass facade.",
      location: "Sector 62, Noida",
      startDate: projectStart,
      expectedEndDate: weeksAfter(projectStart, 40),
      // Falling behind: a realistic AT_RISK / DELAYED trend.
      weeklyProgress: [
        [20, 18],
        [35, 32],
        [50, 44],
      ],
    },
    {
      name: "Residential Tower",
      description: "22-floor residential tower, 4 apartments per floor, RCC framed structure.",
      location: "Baner, Pune",
      startDate: projectStart,
      expectedEndDate: weeksAfter(projectStart, 60),
      // Roughly on track.
      weeklyProgress: [
        [12, 12],
        [24, 23],
        [36, 35],
      ],
    },
    {
      name: "Retail Complex",
      description: "Single-storey retail complex with 30 store units and a central atrium.",
      location: "Whitefield, Bengaluru",
      startDate: projectStart,
      expectedEndDate: weeksAfter(projectStart, 24),
      // Ahead of schedule.
      weeklyProgress: [
        [15, 17],
        [30, 34],
        [45, 50],
      ],
    },
  ];

  for (const seedProject of seedProjects) {
    const project = await prisma.project.upsert({
      where: {
        // No natural unique key besides id; emulate "create if not exists by name"
        // for idempotent re-seeding by looking it up first.
        id: (await prisma.project.findFirst({ where: { name: seedProject.name } }))?.id ?? "__none__",
      },
      update: {},
      create: {
        name: seedProject.name,
        description: seedProject.description,
        location: seedProject.location,
        status: "IN_PROGRESS",
        startDate: seedProject.startDate,
        expectedEndDate: seedProject.expectedEndDate,
        managerId: manager.id,
      },
    });

    for (let week = 0; week < seedProject.weeklyProgress.length; week++) {
      const [plannedProgress, actualProgress] = seedProject.weeklyProgress[week];
      const recordDate = weeksAfter(seedProject.startDate, week + 1);
      const deviation = computeDeviation(plannedProgress, actualProgress);
      const status = computeProgressStatus(deviation);

      const record = await prisma.progressRecord.upsert({
        where: { projectId_recordDate: { projectId: project.id, recordDate } },
        update: { plannedProgress, actualProgress, deviation, status },
        create: {
          projectId: project.id,
          recordDate,
          plannedProgress,
          actualProgress,
          deviation,
          status,
        },
      });

      if (deviation !== null && deviation < 0) {
        const result = estimateDelay({
          deviation,
          projectStartDate: project.startDate,
          projectExpectedEndDate: project.expectedEndDate,
        });

        await prisma.delayPrediction.upsert({
          where: { progressRecordId: record.id },
          update: {
            deviation,
            estimatedDelayDays: result.estimatedDelayDays,
            riskLevel: result.riskLevel,
            explanation: result.explanation,
            methodology: result.methodology,
          },
          create: {
            projectId: project.id,
            progressRecordId: record.id,
            deviation,
            estimatedDelayDays: result.estimatedDelayDays,
            riskLevel: result.riskLevel,
            explanation: result.explanation,
            methodology: result.methodology,
          },
        });
      }
    }

    console.log(`  Seeded project: ${seedProject.name}`);
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
