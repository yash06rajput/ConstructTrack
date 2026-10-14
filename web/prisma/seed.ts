/**
 * Development/demo seed data.
 *
 * This is NOT production data. It exists purely so the dashboard (the portfolio
 * dashboard) has realistic-looking projects and progress history to
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
  // [weekNumber, plannedProgress, actualProgress][] — weekNumber counts
  // from the project start date. Planned values follow the project's own
  // timeline, so progress, delay prediction and risk all stay consistent.
  progress: [number, number, number][];
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

  // Dates are relative to "today" so the demo always shows recent history.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weeksAgo = (weeks: number) => weeksAfter(today, -weeks);

  const seedProjects: SeedProject[] = [
    {
      name: "Commercial Office Building",
      description:
        "8-storey commercial office building with basement parking, steel-and-glass facade.",
      location: "Sector 62, Noida",
      startDate: weeksAgo(20),
      expectedEndDate: weeksAfter(weeksAgo(20), 40),
      // Slipping steadily behind plan -> HIGH schedule risk.
      progress: [
        [4, 8, 8],
        [8, 18, 16],
        [12, 29, 25],
        [16, 40, 33],
        [20, 50, 40],
      ],
    },
    {
      name: "Residential Tower",
      description: "22-floor residential tower, 4 apartments per floor, RCC framed structure.",
      location: "Baner, Pune",
      startDate: weeksAgo(16),
      expectedEndDate: weeksAfter(weeksAgo(16), 60),
      // Roughly on plan -> LOW risk.
      progress: [
        [4, 6, 6],
        [8, 13, 13],
        [12, 20, 19],
        [16, 27, 26],
      ],
    },
    {
      name: "Retail Complex",
      description: "Single-storey retail complex with 30 store units and a central atrium.",
      location: "Whitefield, Bengaluru",
      startDate: weeksAgo(12),
      expectedEndDate: weeksAfter(weeksAgo(12), 24),
      // Ahead of plan -> projected to finish early.
      progress: [
        [4, 15, 17],
        [8, 32, 36],
        [12, 50, 56],
      ],
    },
    {
      name: "Metro Station Annex",
      description: "Two-level station annex with concourse, ticketing hall and service rooms.",
      location: "Dwarka, New Delhi",
      startDate: weeksAgo(16),
      expectedEndDate: weeksAfter(weeksAgo(16), 36),
      // Work has nearly stalled -> CRITICAL risk.
      progress: [
        [4, 10, 9],
        [8, 21, 18],
        [12, 33, 22],
        [16, 44, 23],
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
      // Re-seeding refreshes the schedule so the demo data stays current.
      update: {
        startDate: seedProject.startDate,
        expectedEndDate: seedProject.expectedEndDate,
      },
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

    // Replace this project's progress history (and the delay predictions
    // derived from it) so re-running the seed never duplicates records.
    await prisma.progressRecord.deleteMany({ where: { projectId: project.id } });

    for (const [week, plannedProgress, actualProgress] of seedProject.progress) {
      const recordDate = weeksAfter(seedProject.startDate, week);
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
