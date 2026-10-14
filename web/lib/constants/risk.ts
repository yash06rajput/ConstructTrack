import type { PredictionRiskLevel } from "@/lib/services/delay-prediction";

/**
 * Display-only mapping from the delay engine's PredictionRiskLevel to a
 * Badge variant. Lives in a plain (non-"use client") module so it can be
 * used by both server components (the report view) and client components
 * (the delay-prediction section).
 */
export function riskBadgeVariant(level: PredictionRiskLevel): "success" | "warning" | "destructive" {
  if (level === "LOW") return "success";
  if (level === "MODERATE") return "warning";
  return "destructive";
}
