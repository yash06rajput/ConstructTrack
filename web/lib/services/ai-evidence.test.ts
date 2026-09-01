import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildObjectCountHistory,
  compareDetections,
  daysBetween,
  listAvailableObjectClasses,
} from "@/lib/services/ai-evidence";

const earlier = {
  imageId: "img-1",
  date: "2026-08-01T00:00:00.000Z",
  originalFilename: "site-aug-01.jpg",
  objectCounts: { person: 4, truck: 1 },
};

const later = {
  imageId: "img-2",
  date: "2026-08-15T00:00:00.000Z",
  originalFilename: "site-aug-15.jpg",
  objectCounts: { person: 8, truck: 2, car: 1 },
};

test("buildObjectCountHistory sorts chronologically and sums totalDetections from real counts", () => {
  const history = buildObjectCountHistory([later, earlier]); // passed out of order
  assert.equal(history[0].imageId, "img-1");
  assert.equal(history[1].imageId, "img-2");
  assert.equal(history[0].totalDetections, 5); // 4 + 1
  assert.equal(history[1].totalDetections, 11); // 8 + 2 + 1
});

test("buildObjectCountHistory returns an empty array for no analyzed images (no fabricated points)", () => {
  assert.deepEqual(buildObjectCountHistory([]), []);
});

test("listAvailableObjectClasses only returns classes that actually appear in real results", () => {
  const classes = listAvailableObjectClasses([earlier, later]);
  assert.deepEqual(classes, ["car", "person", "truck"]);
});

test("listAvailableObjectClasses is empty when there is no evidence", () => {
  assert.deepEqual(listAvailableObjectClasses([]), []);
});

test("compareDetections produces a factual per-class diff, including classes only present later", () => {
  const comparison = compareDetections(earlier, later);
  assert.deepEqual(comparison.rows, [
    { className: "car", earlier: 0, later: 1, change: 1 },
    { className: "person", earlier: 4, later: 8, change: 4 },
    { className: "truck", earlier: 1, later: 2, change: 1 },
  ]);
  assert.equal(comparison.totalEarlier, 5);
  assert.equal(comparison.totalLater, 11);
  assert.equal(comparison.totalChange, 6);
});

test("compareDetections handles a class disappearing entirely later (change is negative, not omitted)", () => {
  const comparison = compareDetections(
    { imageId: "a", date: "2026-08-01", originalFilename: "a.jpg", objectCounts: { bus: 2 } },
    { imageId: "b", date: "2026-08-08", originalFilename: "b.jpg", objectCounts: {} },
  );
  assert.deepEqual(comparison.rows, [{ className: "bus", earlier: 2, later: 0, change: -2 }]);
  assert.equal(comparison.totalChange, -2);
});

test("daysBetween computes real elapsed calendar days", () => {
  assert.equal(daysBetween("2026-08-01T00:00:00.000Z", "2026-08-15T00:00:00.000Z"), 14);
});
