import "server-only";
import { aiServiceUnavailable, validationError, ApiError } from "@/lib/api/errors";

/**
 * Response contract for the Python AI service's POST /api/v1/analyze.
 * Kept in sync with ai-service/app/models/analysis.py's AnalyzeImageResponse.
 *
 * Every field here is real YOLO11 output — there is deliberately no
 * "completion_percentage" or similar construction-progress field, because
 * a generic pretrained COCO model cannot honestly produce one. See
 * docs/ai-pipeline.md.
 */
export interface AiDetection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface AiAnalysisResponse {
  success: true;
  model: string;
  image: { width: number; height: number };
  detections: AiDetection[];
  object_counts: Record<string, number>;
  average_confidence: number | null;
  analysis_summary: string;
  processing_time_ms: number;
  annotated_image_base64: string | null;
}

interface AnalyzeConstructionImageInput {
  /** Short-lived Supabase signed URL — never a service-role secret. */
  imageUrl: string;
  imageId: string;
  projectId: string;
}

/**
 * Calls the Python AI service to run real YOLO11 analysis on a
 * construction image. The AI service receives only a short-lived signed
 * URL plus the image/project ids for logging — no database credentials or
 * Supabase service-role key ever leave this process.
 */
export async function analyzeConstructionImage(
  input: AnalyzeConstructionImageInput,
): Promise<AiAnalysisResponse> {
  const baseUrl = process.env.AI_SERVICE_URL;
  if (!baseUrl) {
    throw new ApiError(
      "AI_SERVICE_UNAVAILABLE",
      "AI_SERVICE_URL is not configured. Set it in .env to point at the Python AI service.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: input.imageUrl,
        image_id: input.imageId,
        project_id: input.projectId,
      }),
      // Real CV inference (image download + YOLO11) can genuinely take a
      // few seconds; this is a synchronous request/response design (see
      // docs/ai-pipeline.md) rather than a queue, so the timeout just
      // needs to be generous, not infinite.
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw aiServiceUnavailable("Could not reach the AI service. Is it running?");
  }

  if (!response.ok) {
    // The AI service's error `detail` can, in principle, echo fragments of
    // its own internal state (a raw exception string, a download URL) —
    // it's logged server-side for debugging but deliberately NOT forwarded
    // verbatim into the client-facing ApiError message, so a Python-service
    // implementation detail never reaches the browser.
    const detail = await readErrorDetail(response);
    if (detail) {
      console.error(`AI service error (status ${response.status}):`, detail);
    }
    if (response.status === 422) {
      // The AI service rejected the image itself (download/decode failure) —
      // that's a problem with this specific image, not the service being down.
      throw validationError("The AI service could not process this image. It may be corrupted, too large, or an unsupported format.");
    }
    if (response.status === 503) {
      throw aiServiceUnavailable("The AI model is not currently available. Please try again shortly.");
    }
    throw aiServiceUnavailable(`AI service responded with status ${response.status}.`);
  }

  const body = (await response.json().catch(() => null)) as AiAnalysisResponse | null;
  if (!body || body.success !== true || !Array.isArray(body.detections) || !body.image) {
    throw aiServiceUnavailable("The AI service returned an unexpected response.");
  }

  return body;
}

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : null;
  } catch {
    return null;
  }
}
