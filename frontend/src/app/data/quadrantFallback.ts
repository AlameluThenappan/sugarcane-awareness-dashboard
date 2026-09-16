// Fallback for the yield/nitrogen quadrant feature when the live Supabase
// RPCs (quadrant_overview / quadrant_insights) are unreachable, mirroring
// the classification and comparison rules in
// supabase/migrations/20260911120000_quadrant_insights.sql and
// 20260917100000_quadrant_comparisons.sql, so the Overview page and the
// quadrant drill-down overlay render the same shape of data whether they're
// fed by Supabase or by this file.
//
// Built from the same approved-survey dataset already checked into
// surveyData.ts, so it needs no network access. Row-level `surveyId`s here
// are positional, not real survey.surveys.survey_id values — clicking into
// a farmer from this fallback may open the wrong profile if the real RPC
// (getSurveyProfile) is reachable but quadrant_insights/quadrant_overview
// were not.
//
// This only runs when the real RPC call fails — never as a DEV-mode
// shortcut. That used to be a real bug: a DEV-only branch here made the
// overlay show this file's (smaller, pre-backfill) numbers while the
// Overview card always read live data, so the two disagreed on every
// quadrant's farmer count.
import { surveyRows, SurveyRow } from "./surveyData";
import { QuadrantKey, QuadrantOverview, QuadrantInsights, QuadrantComparisons, QuadrantComparison } from "../lib/api";

const N_THRESHOLD = 130;
const QUADRANT_KEYS: QuadrantKey[] = ["eff", "exc", "und", "cri"];

const QUADRANT_LABEL: Record<QuadrantKey, string> = {
  eff: "Efficient Target",
  exc: "Excessive N",
  und: "Under-Fertilized",
  cri: "Critical Outliers",
};

function eligibleRows(): SurveyRow[] {
  return surveyRows.filter((r) => r.yield > 0 && r.n > 0);
}

function computeYieldSplit(rows: SurveyRow[]): number {
  if (rows.length === 0) return 0;
  const avg = rows.reduce((sum, r) => sum + r.yield, 0) / rows.length;
  return Math.round(avg * 10) / 10;
}

function classify(row: SurveyRow, yieldSplit: number): QuadrantKey {
  if (row.yield >= yieldSplit) return row.n >= N_THRESHOLD ? "exc" : "eff";
  return row.n >= N_THRESHOLD ? "cri" : "und";
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function mode(values: (string | null | undefined)[]): { value: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of counts) {
    if (!best || count > best.count || (count === best.count && value < best.value)) {
      best = { value, count };
    }
  }
  return best;
}

type Buckets = Record<QuadrantKey, SurveyRow[]>;

function classifyAll(): { yieldSplit: number; buckets: Buckets } {
  const eligible = eligibleRows();
  const yieldSplit = computeYieldSplit(eligible);
  const buckets: Buckets = { eff: [], exc: [], und: [], cri: [] };
  for (const row of eligible) buckets[classify(row, yieldSplit)].push(row);
  return { yieldSplit, buckets };
}

export function fallbackQuadrantOverview(): QuadrantOverview {
  const { yieldSplit, buckets } = classifyAll();
  const eligible = QUADRANT_KEYS.reduce((sum, k) => sum + buckets[k].length, 0);
  const counts: Record<QuadrantKey, number> = {
    eff: buckets.eff.length, exc: buckets.exc.length, und: buckets.und.length, cri: buckets.cri.length,
  };
  return { yieldSplit, nThreshold: N_THRESHOLD, eligibleFarmers: eligible, counts };
}

function pctWithValue(rows: SurveyRow[], key: "irrigation" | "fertilizerMethod" | "crop", value: string | null): number {
  if (!value || rows.length === 0) return 0;
  const n = rows.filter((r) => r[key] === value).length;
  return Math.round((n * 100) / rows.length);
}

function organicPctOf(rows: SurveyRow[]): number {
  if (rows.length === 0) return 0;
  return Math.round((rows.filter((r) => r.fym === "Yes").length * 100) / rows.length);
}

function avgPlotOf(rows: SurveyRow[]): number | null {
  const sizes = rows.map((r) => r.largestPlotAcres).filter((v) => v != null);
  if (!sizes.length) return null;
  return Math.round(average(sizes) * 100) / 100;
}

function rangeAcross(keys: QuadrantKey[], buckets: Buckets, valueFn: (rows: SurveyRow[]) => number): { min: number; max: number } {
  const values = keys.map((k) => valueFn(buckets[k]));
  return { min: Math.min(...values), max: Math.max(...values) };
}

// Same relative-spread gate as the SQL version: a percentage factor only
// counts as having a real range at all if (max-min)/min is at least 50%
// across all four quadrants — otherwise "different by a few points, same
// behavior everywhere" (e.g. ratoon share) doesn't get presented as if it
// were a meaningful split.
function hasRealSpread(buckets: Buckets, valueFn: (rows: SurveyRow[]) => number): boolean {
  const { min, max } = rangeAcross(QUADRANT_KEYS, buckets, valueFn);
  if (min === 0) return true;
  return max - min >= 0.5 * min;
}

function buildComparisons(buckets: Buckets, quadrant: QuadrantKey): QuadrantComparisons {
  const rows = buckets[quadrant];
  const others = QUADRANT_KEYS.filter((k) => k !== quadrant);

  const irrMode = mode(rows.map((r) => r.irrigation));
  const irrPct = irrMode ? Math.round((irrMode.count * 100) / (rows.length || 1)) : null;
  const irrOthers = rangeAcross(others, buckets, (r) => pctWithValue(r, "irrigation", irrMode?.value ?? null));

  const methMode = mode(rows.map((r) => r.fertilizerMethod));
  const methPct = methMode ? Math.round((methMode.count * 100) / (rows.length || 1)) : null;
  const methOthers = rangeAcross(others, buckets, (r) => pctWithValue(r, "fertilizerMethod", methMode?.value ?? null));

  const cropMode = mode(rows.map((r) => r.crop));
  const cropPct = cropMode ? Math.round((cropMode.count * 100) / (rows.length || 1)) : null;
  const cropValueFn = (r: SurveyRow[]) => pctWithValue(r, "crop", cropMode?.value ?? null);
  const cropOthers = rangeAcross(others, buckets, cropValueFn);
  const ratoonSpreadOk = hasRealSpread(buckets, cropValueFn);

  const avgPlot = avgPlotOf(rows);
  const plotOthers = rangeAcross(others, buckets, (r) => avgPlotOf(r) ?? 0);

  const organicPct = organicPctOf(rows);
  const organicOthers = rangeAcross(others, buckets, organicPctOf);
  const organicSpreadOk = hasRealSpread(buckets, organicPctOf);

  const mk = (factor: string, value: string | number | null, pct: number | null, range: { min: number; max: number }, differs: boolean): QuadrantComparison => ({
    factor, value, pct, othersMin: range.min, othersMax: range.max, meaningfullyDiffers: differs,
  });

  return {
    irrigation: mk("irrigation", irrMode?.value ?? null, irrPct, irrOthers, irrPct != null && (irrPct < irrOthers.min || irrPct > irrOthers.max)),
    fertilizerMethod: mk("fertilizerMethod", methMode?.value ?? null, methPct, methOthers, methPct != null && (methPct < methOthers.min || methPct > methOthers.max)),
    plotSize: mk("plotSize", avgPlot, null, plotOthers, avgPlot != null && (avgPlot < plotOthers.min || avgPlot > plotOthers.max)),
    organicAdoption: mk("organicAdoption", organicPct, null, organicOthers, organicSpreadOk && (organicPct < organicOthers.min || organicPct > organicOthers.max)),
    ratoonShare: mk("ratoonShare", cropMode?.value ?? null, cropPct, cropOthers, ratoonSpreadOk && cropPct != null && (cropPct < cropOthers.min || cropPct > cropOthers.max)),
  };
}

export function fallbackQuadrantInsights(quadrant: QuadrantKey): QuadrantInsights {
  const { yieldSplit, buckets } = classifyAll();
  const eligible = QUADRANT_KEYS.reduce((sum, k) => sum + buckets[k].length, 0);
  const rows = buckets[quadrant];
  const total = rows.length || 1;

  const irrigationMode = mode(rows.map((r) => r.irrigation));
  const methodMode = mode(rows.map((r) => r.fertilizerMethod));
  const cropMode = mode(rows.map((r) => r.crop));
  const organicRows = rows.filter((r) => r.fym === "Yes");
  const plotSizes = rows.map((r) => r.largestPlotAcres).filter((v) => v != null);

  const records = rows
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name) || a.uniqueID.localeCompare(b.uniqueID))
    .map((r, i) => ({
      surveyId: i + 1,
      farmerCode: r.id,
      name: r.name,
      village: r.village,
      block: r.block,
      cropType: r.crop,
      largestPlotAcres: r.largestPlotAcres,
      yield: r.yield,
      nitrogen: r.n,
      irrigation: r.irrigation,
      fertilizerMethod: r.fertilizerMethod,
      organicInputs: r.fym === "Yes" ? ["Farm Yard Manure"] : [],
    }));

  return {
    key: quadrant,
    label: QUADRANT_LABEL[quadrant],
    yieldSplit,
    nThreshold: N_THRESHOLD,
    eligibleFarmers: eligible,
    farmerCount: rows.length,
    avgYield: average(rows.map((r) => r.yield)),
    avgNitrogen: average(rows.map((r) => r.n)),
    avgLargestPlotAcres: plotSizes.length ? Math.round(average(plotSizes) * 100) / 100 : null,
    organicUsers: organicRows.length,
    organicPct: Math.round((organicRows.length * 100) / total),
    dominantIrrigation: irrigationMode ? { ...irrigationMode, pct: Math.round((irrigationMode.count * 100) / total) } : null,
    dominantMethod: methodMode ? { ...methodMode, pct: Math.round((methodMode.count * 100) / total) } : null,
    dominantCropType: cropMode ? { ...cropMode, pct: Math.round((cropMode.count * 100) / total) } : null,
    records,
    comparisons: buildComparisons(buckets, quadrant),
  };
}
