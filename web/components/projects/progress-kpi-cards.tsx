import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPercent, formatSignedPercent } from "@/lib/format";
import type { ProgressSummary } from "@/lib/services/progress-analytics";

/**
 * The project-level progress KPI row. Every number here is read straight
 * from `ProgressSummary` (lib/services/progress-analytics.ts), computed
 * from real ProgressRecord data — nothing is fabricated, and each card
 * explicitly says "unavailable" rather than guessing when the underlying
 * data doesn't support a value (see computeProgressSummary/computeProgressTrend).
 */
export function ProgressKpiCards({ summary }: { summary: ProgressSummary }) {
  if (!summary.hasData) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm font-medium">No progress updates yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add the first progress update to start tracking planned vs. actual performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  const varianceTone =
    summary.variance === null
      ? "text-muted-foreground"
      : summary.variance > 0
        ? "text-[var(--chart-2)]"
        : summary.variance < 0
          ? "text-destructive"
          : "text-foreground";

  const TrendIcon =
    summary.trend.averageGainPerWeek === null
      ? Minus
      : summary.trend.averageGainPerWeek > 0
        ? TrendingUp
        : summary.trend.averageGainPerWeek < 0
          ? TrendingDown
          : Minus;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card>
        <CardContent className="py-5">
          <p className="text-xs font-medium text-muted-foreground">Actual progress</p>
          <p className="mt-1 text-2xl font-semibold">{formatPercent(summary.currentActual)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <p className="text-xs font-medium text-muted-foreground">Planned progress</p>
          <p className="mt-1 text-2xl font-semibold">{formatPercent(summary.currentPlanned)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <p className="text-xs font-medium text-muted-foreground">Variance</p>
          {summary.varianceAvailable ? (
            <>
              <p className={`mt-1 text-2xl font-semibold ${varianceTone}`}>
                {formatSignedPercent(summary.variance)}
              </p>
              {summary.statusLabel && (
                <Badge variant="outline" className="mt-1.5">
                  {summary.statusLabel}
                </Badge>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Actual progress not yet recorded for this date.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <p className="text-xs font-medium text-muted-foreground">Avg. progress / week</p>
          {summary.trend.available ? (
            <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold">
              <TrendIcon className="size-5" />
              {formatSignedPercent(summary.trend.averageGainPerWeek)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Trend unavailable — {summary.trend.reason}
            </p>
          )}
        </CardContent>
      </Card>

      {summary.asOfDate && (
        <p className="col-span-2 text-xs text-muted-foreground sm:col-span-4">
          Last updated {formatDate(summary.asOfDate)}
        </p>
      )}
    </div>
  );
}
