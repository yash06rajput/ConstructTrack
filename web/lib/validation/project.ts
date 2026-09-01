import { z } from "zod";

/**
 * Mirrors the Prisma `ProjectStatus` enum exactly — do not duplicate this
 * list elsewhere. If the schema's enum ever changes, update it here only.
 */
export const projectStatusEnum = z.enum([
  "PLANNING",
  "IN_PROGRESS",
  "ON_HOLD",
  "DELAYED",
  "COMPLETED",
]);

export const PROJECT_STATUS_VALUES = projectStatusEnum.options;

const baseProjectFields = {
  name: z
    .string()
    .trim()
    .min(2, "Project name must be at least 2 characters.")
    .max(150, "Project name must be 150 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer.")
    .optional()
    .or(z.literal("")),
  location: z
    .string()
    .trim()
    .max(255, "Location must be 255 characters or fewer.")
    .optional()
    .or(z.literal("")),
  status: projectStatusEnum.optional(),
};

export const createProjectSchema = z
  .object({
    ...baseProjectFields,
    startDate: z.coerce.date({ error: "A valid start date is required." }),
    expectedEndDate: z.coerce.date({ error: "A valid expected end date is required." }),
    // No auth yet — if omitted, the API resolves a default demo manager.
    managerId: z.string().min(1).optional(),
  })
  .refine((data) => data.expectedEndDate >= data.startDate, {
    message: "Expected end date must be on or after the start date.",
    path: ["expectedEndDate"],
  });

export const updateProjectSchema = z
  .object({
    name: baseProjectFields.name.optional(),
    description: baseProjectFields.description.nullable(),
    location: baseProjectFields.location.nullable(),
    status: projectStatusEnum.optional(),
    startDate: z.coerce.date().optional(),
    expectedEndDate: z.coerce.date().optional(),
  })
  .partial()
  .refine(
    (data) =>
      !data.startDate || !data.expectedEndDate || data.expectedEndDate >= data.startDate,
    {
      message: "Expected end date must be on or after the start date.",
      path: ["expectedEndDate"],
    },
  );

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
