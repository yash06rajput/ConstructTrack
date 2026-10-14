/**
 * Reproduces the evaluation reported in the project report and research
 * paper: engine output on structured scenarios versus a deviation-only
 * baseline, a determinism check, and a weight-sensitivity analysis.
 *
 * Run with:  npm run evaluate
 *
 * Uses a fixed reference date so the numbers are identical on every run.
 */
import {
  classifyRisk,
  classifyPredictionRiskLevel,
  computeDelayPrediction,
} from "../lib/services/delay-prediction";

const REFERENCE_DATE = new Date("2026-10-14T00:00:00Z");
const DAY_MS = 86_400_000;
const addWeeks = (date: Date, weeks: number) => new Date(date.getTime() + weeks * 7 * DAY_MS);

interface Scenario {
  name: string;
  /** Project started this many weeks before the reference date. */
  startedWeeksAgo: number;
  /** Planned duration in weeks. */
  plannedWeeks: number;
  /** [week from start, planned %, actual %] */
  records: [number, number, number][];
}

const SCENARIOS: Scenario[] = [
  { name: "Office, slipping", startedWeeksAgo: 20, plannedWeeks: 40,
    records: [[4, 8, 8], [8, 18, 16], [12, 29, 25], [16, 40, 33], [20, 50, 40]] },
  { name: "Tower, on plan", startedWeeksAgo: 16, plannedWeeks: 60,
    records: [[4, 6, 6], [8, 13, 13], [12, 20, 19], [16, 27, 26]] },
  { name: "Retail, ahead", startedWeeksAgo: 12, plannedWeeks: 24,
    records: [[4, 15, 17], [8, 32, 36], [12, 50, 56]] },
  { name: "Annex, stalled", startedWeeksAgo: 16, plannedWeeks: 36,
    records: [[4, 10, 9], [8, 21, 18], [12, 33, 22], [16, 44, 23]] },
  { name: "Single record", startedWeeksAgo: 4, plannedWeeks: 30, records: [[4, 13, 11]] },
  { name: "Exact pace", startedWeeksAgo: 8, plannedWeeks: 20, records: [[4, 20, 20], [8, 40, 40]] },
];

function run(scenario: Scenario) {
  const start = addWeeks(REFERENCE_DATE, -scenario.startedWeeksAgo);
  const end = addWeeks(start, scenario.plannedWeeks);
  const records = scenario.records.map(([week, plannedProgress, actualProgress]) => ({
    recordDate: addWeeks(start, week),
    plannedProgress,
    actualProgress,
  }));
  return { start, end, records, result: computeDelayPrediction({ startDate: start, expectedEndDate: end }, records) };
}

// ---- 1. Scenario evaluation vs. deviation-only baseline -------------------
console.log("\n1) Engine output vs. deviation-only baseline\n");
const rows = SCENARIOS.map((scenario) => {
  const { result } = run(scenario);
  return {
    scenario: scenario.name,
    n: result.usableRecordCount,
    deviation: result.currentDeviation,
    velocityRatio: result.velocityRatio,
    predictedDelayDays: result.predictedDelayDays,
    riskScore: result.riskScore,
    riskBand: result.riskLevel ?? "withheld",
    baseline: result.currentDeviation === null ? "—" : classifyRisk(result.currentDeviation),
  };
});
console.table(rows);

// ---- 2. Determinism -------------------------------------------------------
const reference = JSON.stringify(SCENARIOS.map((s) => run(s).result));
let identical = true;
for (let i = 0; i < 1000; i++) {
  if (JSON.stringify(SCENARIOS.map((s) => run(s).result)) !== reference) identical = false;
}
console.log(`\n2) Determinism: 1,000 repeated runs identical = ${identical}`);

// ---- 3. Weight sensitivity ------------------------------------------------
// Factor scores mirror lib/services/delay-prediction.ts (Table II).
const varianceScore = (d: number) => (d >= 0 ? 10 : d >= -5 ? 40 : d >= -15 ? 65 : 90);
const velocityScore = (r: number) => (r >= 1 ? 10 : r >= 0.8 ? 35 : r >= 0.5 ? 65 : 90);

const factorRows = SCENARIOS.slice(0, 4).map((scenario) => {
  const { start, end, result } = run(scenario);
  const plannedDays = (end.getTime() - start.getTime()) / DAY_MS;
  const delay = result.predictedDelayDays ?? 0;
  const deltaScore = delay <= 0 ? 5 : Math.min(100, Math.round((delay / plannedDays / 0.3) * 100));
  const last3 = scenario.records.slice(-3).map(([, p, a]) => a - p);
  const change = last3[last3.length - 1] - last3[0];
  const trendScore = change > 1 ? 20 : change < -1 ? 80 : 50;
  const scores = [varianceScore(result.currentDeviation!), velocityScore(result.velocityRatio!), deltaScore, trendScore];
  return { name: scenario.name, scores, engineScore: result.riskScore!, band: result.riskLevel! };
});

const BASE_WEIGHTS = [0.3, 0.3, 0.25, 0.15];
const score = (w: number[], s: number[]) => {
  const total = w.reduce((a, b) => a + b, 0);
  return Math.round(w.reduce((acc, wi, i) => acc + (wi / total) * s[i], 0));
};
for (const row of factorRows) {
  if (score(BASE_WEIGHTS, row.scores) !== row.engineScore) {
    throw new Error(`Factor replication mismatch for ${row.name}`);
  }
}

let oatChanges = 0;
let oatCases = 0;
for (let i = 0; i < BASE_WEIGHTS.length; i++) {
  for (const factor of [0.8, 1.2]) {
    const w = BASE_WEIGHTS.map((x, j) => (j === i ? x * factor : x));
    for (const row of factorRows) {
      oatCases++;
      if (classifyPredictionRiskLevel(score(w, row.scores)) !== row.band) oatChanges++;
    }
  }
}

let seed = 42;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const DRAWS = 10_000;
let bandChanges = 0;
let maxShift = 0;
let rankingPreserved = 0;
const changedBy: Record<string, number> = {};
for (let k = 0; k < DRAWS; k++) {
  const w = BASE_WEIGHTS.map((x) => x * (0.7 + 0.6 * random()));
  const scores = factorRows.map((row) => score(w, row.scores));
  factorRows.forEach((row, i) => {
    maxShift = Math.max(maxShift, Math.abs(scores[i] - row.engineScore));
    if (classifyPredictionRiskLevel(scores[i]) !== row.band) {
      bandChanges++;
      changedBy[row.name] = (changedBy[row.name] ?? 0) + 1;
    }
  });
  const [office, tower, retail, annex] = factorRows.map((row) => {
    const total = w.reduce((a, b) => a + b, 0);
    return w.reduce((acc, wi, i) => acc + (wi / total) * row.scores[i], 0);
  });
  if (annex > office && office > tower && tower > retail) rankingPreserved++;
}

console.log("\n3) Weight sensitivity");
console.log(`   ±20% one-at-a-time: ${oatChanges} band changes in ${oatCases} cases`);
console.log(`   Random ±30% (${DRAWS.toLocaleString()} draws): max score shift ${maxShift} points`);
console.log(`   Ranking of 4 projects preserved: ${rankingPreserved} / ${DRAWS}`);
console.log(
  `   Band changes: ${((100 * bandChanges) / (DRAWS * factorRows.length)).toFixed(1)}% of evaluations`,
  changedBy,
);
console.log();
