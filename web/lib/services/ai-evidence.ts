/**
 * Server- and client-safe (no Prisma/Next.js imports) historical AI
 * evidence analytics.
 *
 * IMPORTANT — academic integrity boundary: everything here operates on
 * REAL, already-persisted YOLO11 detection counts (see docs/ai-pipeline.md
 * and docs/progress-monitoring.md). It only ever produces factual
 * comparisons/aggregations of those counts — it NEVER derives a
 * construction-completion percentage, a progress estimate, or any project-
 * status claim from them. That distinction belongs entirely to
 * lib/services/progress-analytics.ts, which uses real ProgressRecord data.
 */

export interface AnalyzedImageEvidence {
  imageId: string;
  /** The date this evidence is plotted against — the image's upload date. */
  date: string;
  originalFilename: string;
  objectCounts: Record<string, number>;
}

export interface ObjectCountHistoryPoint {
  imageId: string;
  date: string;
  originalFilename: string;
  totalDetections: number;
  objectCounts: Record<string, number>;
}

/** Chronological (oldest first) history of detection counts, for charting. */
export function buildObjectCountHistory(images: AnalyzedImageEvidence[]): ObjectCountHistoryPoint[] {
  return [...images]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((image) => ({
      imageId: image.imageId,
      date: image.date,
      originalFilename: image.originalFilename,
      totalDetections: Object.values(image.objectCounts).reduce((sum, count) => sum + count, 0),
      objectCounts: image.objectCounts,
    }));
}

/**
 * The union of object classes that actually appear across the project's
 * real analyzed images — used to populate a class filter without ever
 * offering a class the model didn't actually detect for this project.
 */
export function listAvailableObjectClasses(images: AnalyzedImageEvidence[]): string[] {
  const classes = new Set<string>();
  for (const image of images) {
    for (const className of Object.keys(image.objectCounts)) {
      classes.add(className);
    }
  }
  return [...classes].sort();
}

export interface DetectionComparisonRow {
  className: string;
  earlier: number;
  later: number;
  change: number;
}

export interface DetectionComparison {
  rows: DetectionComparisonRow[];
  totalEarlier: number;
  totalLater: number;
  totalChange: number;
}

/**
 * A purely factual diff of two images' real detection counts. This is
 * "detected activity" evidence, not a construction-progress calculation —
 * callers must not relabel `totalChange` as a completion percentage.
 */
export function compareDetections(
  earlier: AnalyzedImageEvidence,
  later: AnalyzedImageEvidence,
): DetectionComparison {
  const classNames = new Set([...Object.keys(earlier.objectCounts), ...Object.keys(later.objectCounts)]);

  const rows: DetectionComparisonRow[] = [...classNames]
    .sort()
    .map((className) => {
      const earlierCount = earlier.objectCounts[className] ?? 0;
      const laterCount = later.objectCounts[className] ?? 0;
      return {
        className,
        earlier: earlierCount,
        later: laterCount,
        change: laterCount - earlierCount,
      };
    });

  const totalEarlier = Object.values(earlier.objectCounts).reduce((sum, count) => sum + count, 0);
  const totalLater = Object.values(later.objectCounts).reduce((sum, count) => sum + count, 0);

  return { rows, totalEarlier, totalLater, totalChange: totalLater - totalEarlier };
}

export function daysBetween(earlierDate: string, laterDate: string): number {
  const ms = new Date(laterDate).getTime() - new Date(earlierDate).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
