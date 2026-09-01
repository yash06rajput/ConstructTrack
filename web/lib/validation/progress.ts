import { z } from "zod";

export const createProgressRecordSchema = z.object({
  projectId: z.string().min(1),
  recordDate: z.coerce.date(),
  plannedProgress: z.number().min(0).max(100),
  actualProgress: z.number().min(0).max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * All fields optional (partial update), but each one — when present — is
 * held to the same bounds as creation. `projectId` is intentionally NOT
 * editable: a progress record's project is fixed at creation.
 */
export const updateProgressRecordSchema = z.object({
  recordDate: z.coerce.date().optional(),
  plannedProgress: z.number().min(0).max(100).optional(),
  // `actualProgress` is nullable (clearing a previously-recorded actual
  // value is a legitimate edit — e.g. correcting a mistaken entry), so it
  // needs to distinguish "not provided" from "explicitly cleared".
  actualProgress: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const listProgressQuerySchema = z.object({
  projectId: z.string().min(1),
});

export type CreateProgressRecordInput = z.infer<typeof createProgressRecordSchema>;
export type UpdateProgressRecordInput = z.infer<typeof updateProgressRecordSchema>;
