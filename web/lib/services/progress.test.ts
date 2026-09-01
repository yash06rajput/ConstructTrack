import { test } from "node:test";
import assert from "node:assert/strict";

import { computeDeviation, computeProgressStatus, PROGRESS_STATUS_THRESHOLDS } from "@/lib/services/progress";

test("computeDeviation: planned=70, actual=64 -> -6 (behind plan)", () => {
  assert.equal(computeDeviation(70, 64), -6);
});

test("computeDeviation: planned=50, actual=55 -> +5 (ahead)", () => {
  assert.equal(computeDeviation(50, 55), 5);
});

test("computeDeviation: planned=50, actual=50 -> 0 (on plan)", () => {
  assert.equal(computeDeviation(50, 50), 0);
});

test("computeDeviation: null actualProgress -> null, not 0 or fabricated", () => {
  assert.equal(computeDeviation(50, null), null);
  assert.equal(computeDeviation(50, undefined), null);
});

test("computeProgressStatus classifies using the documented thresholds", () => {
  assert.equal(computeProgressStatus(PROGRESS_STATUS_THRESHOLDS.aheadAbove), "AHEAD");
  assert.equal(computeProgressStatus(0), "ON_TRACK");
  assert.equal(computeProgressStatus(PROGRESS_STATUS_THRESHOLDS.atRiskBelow), "AT_RISK");
  assert.equal(computeProgressStatus(PROGRESS_STATUS_THRESHOLDS.delayedBelow), "DELAYED");
  assert.equal(computeProgressStatus(null), null);
});
