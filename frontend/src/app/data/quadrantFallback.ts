// Local-dev fallback for the yield/nitrogen quadrant feature, mirroring the
// classification in supabase/migrations/20260911120000_quadrant_insights.sql
// (public.quadrant_classification / quadrant_overview / quadrant_insights)
// so the Overview page and the quadrant drill-down overlay render the same
// shape of data whether they're fed by Supabase or by this file.
//
// Built from the same approved-survey dataset already checked into
// surveyData.ts, so it needs no network access. Row-level `surveyId`s here
// are positional, not real survey.surveys.survey_id values — clicking into
// a farmer from this fallback may open the wrong profile if the real RPC
// (getSurveyProfile) is reachable but quadrant_insights/quadrant_overview
// were not. This only runs in dev (`import.meta.env.DEV`) or when the real
// RPC call fails.
import { surveyRows, SurveyRow } from "./surveyData";
import { QuadrantKey, QuadrantOverview, QuadrantInsights, QuadrantRecord } from "../lib/api";

const N_THRESHOLD = 130;

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

export function fallbackQuadrantOverview(): QuadrantOverview {
  const eligible = eligibleRows();
  const yieldSplit = computeYieldSplit(eligible);
  const counts: Record<QuadrantKey, number> = { eff: 0, exc: 0, und: 0, cri: 0 };
  for (const row of eligible) counts[classify(row, yieldSplit)]++;
  return { yieldSplit, nThreshold: N_THRESHOLD, eligibleFarmers: eligible.length, counts };
}

export function fallbackQuadrantInsights(quadrant: QuadrantKey): QuadrantInsights {
  const eligible = eligibleRows();
  const yieldSplit = computeYieldSplit(eligible);
  const rows = eligible.filter((row) => classify(row, yieldSplit) === quadrant);
  const total = rows.length || 1;

  const irrigationMode = mode(rows.map((r) => r.irrigation));
  const methodMode = mode(rows.map((r) => r.fertilizerMethod));
  const cropMode = mode(rows.map((r) => r.crop));
  const organicRows = rows.filter((r) => r.fym === "Yes");
  const plotSizes = rows.map((r) => r.largestPlotAcres).filter((v) => v != null);

  const records: QuadrantRecord[] = rows
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
    eligibleFarmers: eligible.length,
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
  };
}
