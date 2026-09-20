import { useEffect, useMemo, useState } from "react";
import { getQuadrantInsights, QuadrantComparison, QuadrantInsights, QuadrantKey, QuadrantRecord } from "../lib/api";
import { DataTable } from "./DataTable";
import { KPITile } from "../pages/PageKit";
import { fallbackQuadrantInsights } from "../data/quadrantFallback";

const QUADRANT_META: Record<QuadrantKey, { label: string; description: string; color: string }> = {
  eff: { label: "Efficient Target", description: "High yield, lower nitrogen application", color: "var(--sage)" },
  exc: { label: "Excessive N", description: "High yield, high nitrogen application", color: "var(--gold)" },
  und: { label: "Under-Fertilized", description: "Low yield, lower nitrogen application", color: "var(--ink)" },
  cri: { label: "Critical Outliers", description: "Low yield, high nitrogen application", color: "var(--clay)" },
};

function readable(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not recorded";
}

function delta(value: number, benchmark: number, unit: string) {
  const amount = Math.abs(value - benchmark).toFixed(1);
  return `${value >= benchmark ? "+" : "−"}${amount} ${unit} vs threshold`;
}

// Appends "vs X-Y{unit} elsewhere" to a KPITile label only when the backend
// (public.quadrant_insights' comparisons object) says this factor actually
// clears the meaningfully-differs bar for this quadrant. When it doesn't,
// the tile still shows the plain value — reporting the number is fine, it's
// the *comparison claim* that's gated, per the "only present a factor as a
// distinguishing insight if it meaningfully differs" rule.
function comparisonSuffix(comp: QuadrantComparison | undefined, unit: string) {
  if (!comp?.meaningfullyDiffers || comp.othersMin == null || comp.othersMax == null) return "";
  const range = comp.othersMin === comp.othersMax ? `${comp.othersMin}${unit}` : `${comp.othersMin}-${comp.othersMax}${unit}`;
  return ` · vs ${range} elsewhere`;
}

// Picks the single "leading" explanatory factor for the summary sentence:
// among factors that pass meaningfullyDiffers, the one with the largest
// *relative* gap from the nearest edge of the other three quadrants' range
// (relative, not absolute, so a percentage factor and an acres factor can
// be ranked on the same scale).
function relativeGap(comp: QuadrantComparison): number {
  const hasNumericBasis = typeof comp.pct === "number" || typeof comp.value === "number";
  if (!comp.meaningfullyDiffers || comp.othersMin == null || comp.othersMax == null || !hasNumericBasis) return 0;
  const value = typeof comp.pct === "number" ? comp.pct : (comp.value as number);
  const edge = value > comp.othersMax ? comp.othersMax : comp.othersMin;
  const gap = Math.abs(value - edge);
  return edge === 0 ? Infinity : gap / edge;
}

function summarySentence(label: string, data: QuadrantInsights): string {
  const factors: { key: keyof QuadrantInsights["comparisons"]; comp: QuadrantComparison }[] = [
    { key: "irrigation", comp: data.comparisons.irrigation },
    { key: "fertilizerMethod", comp: data.comparisons.fertilizerMethod },
    { key: "plotSize", comp: data.comparisons.plotSize },
    { key: "organicAdoption", comp: data.comparisons.organicAdoption },
    { key: "ratoonShare", comp: data.comparisons.ratoonShare },
  ].filter((f) => f.comp.meaningfullyDiffers);

  if (factors.length === 0) {
    return `${label} farmers don't show a single practice that clearly sets them apart from the other three groups — irrigation, fertilizer method, plot size, and organic adoption all fall within the same range as everyone else.`;
  }

  const leading = factors.reduce((best, f) => (relativeGap(f.comp) > relativeGap(best.comp) ? f : best));
  const c = leading.comp;
  const range = c.othersMin === c.othersMax ? `${c.othersMin}` : `${c.othersMin}-${c.othersMax}`;

  switch (leading.key) {
    case "irrigation":
      return `${label} farmers are distinguished primarily by ${readable(c.value as string).toLowerCase()} — used by ${c.pct}% of this group compared to ${range}% in the other three groups.`;
    case "fertilizerMethod":
      return `${label} farmers are distinguished primarily by their fertilizer application method — ${readable(c.value as string)} is used by ${c.pct}% of this group compared to ${range}% in the other three groups.`;
    case "plotSize":
      return `${label} farmers are distinguished primarily by plot size — averaging ${c.value} acres compared to ${range} acres in the other three groups.`;
    case "organicAdoption":
      return `${label} farmers are distinguished primarily by organic input adoption — ${c.value}% of this group use organic inputs, compared to ${range}% in the other three groups.`;
    case "ratoonShare":
      return `${label} farmers are distinguished primarily by their crop mix — ${readable(c.value as string)} accounts for ${c.pct}% of this group compared to ${range}% in the other three groups.`;
    default:
      return "";
  }
}

export function QuadrantInsightsOverlay({
  quadrant,
  onClose,
  onSelectFarmer,
}: {
  quadrant: QuadrantKey;
  onClose: () => void;
  onSelectFarmer: (surveyId: number) => void;
}) {
  const [data, setData] = useState<QuadrantInsights | null>(null);
  const [error, setError] = useState(false);
  const meta = QUADRANT_META[quadrant];

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
    // Always try the live shared-classification RPC first — in dev and in
    // prod alike — falling back to the bundled static snapshot only if
    // it's genuinely unreachable. A dev-only fallback here previously made
    // this overlay show a different (stale, pre-backfill) farmer count
    // than the always-live Overview card, for every quadrant.
    getQuadrantInsights(quadrant)
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setData(fallbackQuadrantInsights(quadrant)); });
    return () => { cancelled = true; };
  }, [quadrant]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const tableColumns = useMemo(() => [
    { header: "Farmer", accessor: (r: QuadrantRecord) => <div><span className="font-semibold block">{r.name}</span><span className="text-[10px] opacity-55 font-mono">{r.farmerCode}</span></div>, sortKey: (r: QuadrantRecord) => r.name },
    { header: "Location", accessor: (r: QuadrantRecord) => <div>{r.village}<span className="block text-[10px] opacity-55">{r.block}</span></div>, sortKey: (r: QuadrantRecord) => `${r.block} ${r.village}` },
    { header: "Crop Type", accessor: (r: QuadrantRecord) => readable(r.cropType), sortKey: (r: QuadrantRecord) => r.cropType || "" },
    { header: "Plot (ac)", align: "right" as const, accessor: (r: QuadrantRecord) => r.largestPlotAcres ?? "—", sortKey: (r: QuadrantRecord) => r.largestPlotAcres ?? -1 },
    { header: "Yield (t/ha)", align: "right" as const, accessor: (r: QuadrantRecord) => r.yield.toFixed(1), sortKey: (r: QuadrantRecord) => r.yield },
    { header: "Nitrogen (kg/ha)", align: "right" as const, accessor: (r: QuadrantRecord) => r.nitrogen.toFixed(1), sortKey: (r: QuadrantRecord) => r.nitrogen },
    { header: "Irrigation", accessor: (r: QuadrantRecord) => readable(r.irrigation), sortKey: (r: QuadrantRecord) => r.irrigation || "" },
    { header: "Application", accessor: (r: QuadrantRecord) => readable(r.fertilizerMethod), sortKey: (r: QuadrantRecord) => r.fertilizerMethod || "" },
    { header: "Fertilizers Applied", accessor: (r: QuadrantRecord) => r.fertilizers && Object.keys(r.fertilizers).length ? Object.entries(r.fertilizers).map(([k,v]) => `${k}: ${v}kg`).join(", ") : "None", sortKey: (r: QuadrantRecord) => r.fertilizers ? Object.keys(r.fertilizers).length : 0 },
    { header: "Organic Inputs", accessor: (r: QuadrantRecord) => r.organicInputs?.length ? r.organicInputs.join(", ") : "None", sortKey: (r: QuadrantRecord) => (r.organicInputs || []).join(" ") },
  ], []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 md:p-8 bg-black/50 backdrop-blur-sm flex items-center justify-center font-sans" onClick={onClose}>
      <div className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-7xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={onClose} className="flex items-center gap-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer">
              <span className="text-sm leading-none" aria-hidden="true">←</span> Back to Dashboard
            </button>
            <p className="eyebrow mt-5 mb-1" style={{ color: meta.color }}>QUADRANT INSIGHTS</p>
            <h1 className="text-3xl font-bold font-outfit tracking-tight">{meta.label}</h1>
            <p className="text-[13px] mt-1 text-muted-foreground">{meta.description}</p>
          </div>
        </div>

        {!data && !error && <div className="py-12 text-center text-muted-foreground text-sm font-medium">Loading quadrant insights…</div>}
        {error && <div className="py-12 text-center text-rose-600 text-sm font-medium bg-rose-50 border border-rose-200 rounded-2xl">Could not load quadrant insights. Please try again.</div>}

        {data && <>
          <p className="text-[12px] text-muted-foreground">Yield split {data.yieldSplit.toFixed(1)} t/ha · Nitrogen threshold {data.nThreshold} kg N/ha{data.farmerCount < 15 ? " · Small cohort: interpret patterns directionally." : ""}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
            <KPITile value={data.farmerCount} label={`Farms (${Math.round(data.farmerCount / data.eligibleFarmers * 100)}% of eligible)`} />
            <KPITile value={data.avgYield.toFixed(1)} unit="t/ha" label={`Avg yield · ${delta(data.avgYield, data.yieldSplit, "t/ha")}`} />
            <KPITile value={data.avgNitrogen.toFixed(1)} unit="kg" label={`Avg nitrogen · ${delta(data.avgNitrogen, data.nThreshold, "kg")}`} />
            <KPITile
              value={data.avgLargestPlotAcres?.toFixed(2) ?? "—"}
              unit="ac"
              label={`Avg largest plot${comparisonSuffix(data.comparisons?.plotSize, "ac")}`}
            />
            <KPITile
              valueClassName="!text-[18px] leading-tight whitespace-normal break-words"
              value={readable(data.dominantIrrigation?.value)}
              label={`Top irrigation${data.dominantIrrigation ? ` · ${data.dominantIrrigation.pct}%` : ""}${comparisonSuffix(data.comparisons?.irrigation, "%")}`}
            />
            <KPITile
              valueClassName="!text-[18px] leading-tight whitespace-normal break-words"
              value={readable(data.dominantMethod?.value)}
              label={`Top application${data.dominantMethod ? ` · ${data.dominantMethod.pct}%` : ""}${comparisonSuffix(data.comparisons?.fertilizerMethod, "%")}`}
            />
            <KPITile
              valueClassName="!text-[18px] leading-tight whitespace-normal break-words"
              value={`${data.organicPct}%`}
              label={`Organic adoption${comparisonSuffix(data.comparisons?.organicAdoption, "%")}`}
            />
          </div>
          <div className="rounded-xl px-4 py-3 text-[12px]" style={{ background: "var(--secondary)", color: "var(--ink)" }}>
            {data.comparisons ? summarySentence(meta.label, data) : ""}
          </div>
          <DataTable<QuadrantRecord>
            title={`${meta.label} Farmers`}
            subtitle={`${data.farmerCount} farmers matching this yield and nitrogen profile`}
            data={data.records}
            columns={tableColumns}
            pageSize={12}
            searchFields={(r) => `${r.name} ${r.farmerCode} ${r.village} ${r.block}`}
            onRowClick={(r) => onSelectFarmer(r.surveyId)}
          />
        </>}
      </div>
    </div>
  );
}
