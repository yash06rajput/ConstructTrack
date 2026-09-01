import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError, notFound } from "@/lib/api/errors";
import { analyzeConstructionImage } from "@/lib/services/ai-service-client";
import {
  buildAnnotatedImageStoragePath,
  createSignedImageUrl,
  uploadAnnotatedImageObject,
} from "@/lib/supabase/storage";
import { toAnalysisSummary, type ImageAnalysisStatusResult } from "@/lib/serializers/analysis";
import type { RunAnalysisInput } from "@/lib/validation/analysis";

async function attachAnnotatedSignedUrl(
  analysis: Awaited<ReturnType<typeof prisma.aIAnalysis.upsert>>,
): Promise<ImageAnalysisStatusResult["analysis"]> {
  const annotatedImageUrl = analysis.annotatedStoragePath
    ? await createSignedImageUrl(analysis.annotatedStoragePath).catch(() => null)
    : null;
  return toAnalysisSummary(analysis, annotatedImageUrl);
}

/**
 * Returns the current analysis status/result for one image.
 * `analysisStatus` (from ConstructionImage) is the source of truth for
 * where things stand — PENDING/PROCESSING/COMPLETED/FAILED — even before
 * any AIAnalysis row exists (a never-analyzed image is a valid PENDING
 * state, not a 404).
 */
export async function getAnalysis(constructionImageId: string): Promise<ImageAnalysisStatusResult> {
  const image = await prisma.constructionImage.findUnique({
    where: { id: constructionImageId },
    include: { analysis: true },
  });
  if (!image) throw notFound("ConstructionImage", constructionImageId);

  return {
    analysisStatus: image.analysisStatus,
    analysis: image.analysis ? await attachAnnotatedSignedUrl(image.analysis) : null,
  };
}

/**
 * Runs real CV analysis for one image via the Python AI service and
 * persists the structured result.
 *
 * Synchronous by design (see docs/ai-pipeline.md): this request awaits the
 * AI service's response and returns the final result directly, rather than
 * introducing a queue/worker — appropriate for a minor project's scale.
 *
 * Status lifecycle: PENDING -> PROCESSING -> COMPLETED | FAILED. A FAILED
 * run still persists an AIAnalysis row (status + errorMessage) so the
 * failure reason survives, and never leaves the image stuck at PROCESSING.
 */
export async function runAnalysis(input: RunAnalysisInput): Promise<ImageAnalysisStatusResult> {
  const image = await prisma.constructionImage.findUnique({
    where: { id: input.constructionImageId },
  });
  if (!image) throw notFound("ConstructionImage", input.constructionImageId);

  if (image.analysisStatus === "PROCESSING") {
    throw new ApiError("CONFLICT", "Analysis is already in progress for this image.");
  }

  await prisma.constructionImage.update({
    where: { id: image.id },
    data: { analysisStatus: "PROCESSING" },
  });

  // The Python service never receives the Supabase service-role key or a
  // permanent URL — only a short-lived signed URL generated here.
  const signedUrl = await createSignedImageUrl(image.storagePath);

  try {
    const result = await analyzeConstructionImage({
      imageUrl: signedUrl,
      imageId: image.id,
      projectId: image.projectId,
    });

    let annotatedStoragePath: string | null = null;
    if (result.annotated_image_base64) {
      try {
        const buffer = Buffer.from(result.annotated_image_base64, "base64");
        const storagePath = buildAnnotatedImageStoragePath(image.projectId, image.id);
        await uploadAnnotatedImageObject(storagePath, buffer);
        annotatedStoragePath = storagePath;
      } catch {
        // The annotated visualization is a bonus feature, not core
        // inference — a storage failure here must not fail the analysis.
        annotatedStoragePath = null;
      }
    }

    const analysis = await prisma.aIAnalysis.upsert({
      where: { constructionImageId: image.id },
      create: {
        constructionImageId: image.id,
        status: "COMPLETED",
        modelVersion: result.model,
        imageWidth: result.image.width,
        imageHeight: result.image.height,
        detectedObjects: result.detections as unknown as Prisma.InputJsonValue,
        objectCounts: result.object_counts as unknown as Prisma.InputJsonValue,
        averageConfidence: result.average_confidence,
        analysisSummary: result.analysis_summary,
        annotatedStoragePath,
        processingTimeMs: result.processing_time_ms,
        errorMessage: null,
      },
      update: {
        status: "COMPLETED",
        modelVersion: result.model,
        imageWidth: result.image.width,
        imageHeight: result.image.height,
        detectedObjects: result.detections as unknown as Prisma.InputJsonValue,
        objectCounts: result.object_counts as unknown as Prisma.InputJsonValue,
        averageConfidence: result.average_confidence,
        analysisSummary: result.analysis_summary,
        annotatedStoragePath,
        processingTimeMs: result.processing_time_ms,
        errorMessage: null,
      },
    });

    await prisma.constructionImage.update({
      where: { id: image.id },
      data: { analysisStatus: "COMPLETED" },
    });

    return { analysisStatus: "COMPLETED", analysis: await attachAnnotatedSignedUrl(analysis) };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Analysis failed unexpectedly. Please try again.";

    // Partial update only — a prior successful result's detection data is
    // left untouched (not nulled out) so re-running analysis and having it
    // fail doesn't destroy the last good result, only marks it stale via
    // status + errorMessage.
    await prisma.aIAnalysis.upsert({
      where: { constructionImageId: image.id },
      create: { constructionImageId: image.id, status: "FAILED", errorMessage: message },
      update: { status: "FAILED", errorMessage: message },
    });

    await prisma.constructionImage.update({
      where: { id: image.id },
      data: { analysisStatus: "FAILED" },
    });

    throw error;
  }
}
