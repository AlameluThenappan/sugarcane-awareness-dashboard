import { useEffect, useMemo, useState } from "react";
import { getQuadrantInsights, QuadrantInsights, QuadrantKey, QuadrantRecord } from "../lib/api";
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
    // The local dashboard ships the approved survey export, so development
    // remains usable before the corresponding Supabase migration is applied.
    if (import.meta.env.DEV) {
      setData(fallbackQuadrantInsights(quadrant));
      return () => { cancelled = true; };
    }
    getQuadrantInsights(quadrant)
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setData(fallbackQuadrantInsights(quadrant)); });
    return () => { cancelled = true; };
  }, [quadrant]);

  const tableColumns = useMemo(() => [
    { header: "Farmer", accessor: (r: QuadrantRecord) => <div><span className="font-semibold block">{r.name}</span><span className="text-[10px] opacity-55 font-mono">{r.farmerCode}</span></div>, sortKey: (r: QuadrantRecord) => r.name },
    { header: "Location", accessor: (r: QuadrantRecord) => <div>{r.village}<span className="block text-[10px] opacity-55">{r.block}</span></div>, sortKey: (r: QuadrantRecord) => `${r.block} ${r.village}` },
    { header: "Crop Type", accessor: (r: QuadrantRecord) => readable(r.cropType), sortKey: (r: QuadrantRecord) => r.cropType || "" },
    { header: "Plot (ac)", align: "right" as const, accessor: (r: QuadrantRecord) => r.largestPlotAcres ?? "—", sortKey: (r: QuadrantRecord) => r.largestPlotAcres ?? -1 },
    { header: "Yield (t/ha)", align: "right" as const, accessor: (r: QuadrantRecord) => r.yield.toFixed(1), sortKey: (r: QuadrantRecord) => r.yield },
    { header: "Nitrogen (kg/ha)", align: "right" as const, accessor: (r: QuadrantRecord) => r.nitrogen.toFixed(1), sortKey: (r: QuadrantRecord) => r.nitrogen },
    { header: "Irrigation", accessor: (r: QuadrantRecord) => readable(r.irrigation), sortKey: (r: QuadrantRecord) => r.irrigation || "" },
    { header: "Application", accessor: (r: QuadrantRecord) => readable(r.fertilizerMethod), sortKey: (r: QuadrantRecord) => r.fertilizerMethod || "" },
    { header: "Organic Inputs", accessor: (r: QuadrantRecord) => r.organicInputs.length ? r.organicInputs.join(", ") : "None", sortKey: (r: QuadrantRecord) => r.organicInputs.join(" ") },
  ], []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 md:p-8 bg-black/50 backdrop-blur-sm flex items-center justify-center font-sans">
      <div className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-7xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6">
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
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPITile value={data.farmerCount} label={`Farms (${Math.round(data.farmerCount / data.eligibleFarmers * 100)}% of eligible)`} />
            <KPITile value={data.avgYield.toFixed(1)} unit="t/ha" label={`Avg yield · ${delta(data.avgYield, data.yieldSplit, "t/ha")}`} />
            <KPITile value={data.avgNitrogen.toFixed(1)} unit="kg" label={`Avg nitrogen · ${delta(data.avgNitrogen, data.nThreshold, "kg")}`} />
            <KPITile value={data.avgLargestPlotAcres?.toFixed(2) ?? "—"} unit="ac" label="Avg largest plot" />
            <KPITile value={readable(data.dominantIrrigation?.value)} label={`Top irrigation${data.dominantIrrigation ? ` · ${data.dominantIrrigation.pct}%` : ""}`} />
            <KPITile value={readable(data.dominantMethod?.value)} label={`Top application${data.dominantMethod ? ` · ${data.dominantMethod.pct}%` : ""}`} />
          </div>
          <div className="rounded-xl px-4 py-3 text-[12px]" style={{ background: "var(--secondary)", color: "var(--ink)" }}>
            <strong>{data.dominantCropType ? `${readable(data.dominantCropType.value)} is the dominant crop type (${data.dominantCropType.pct}%).` : "Crop type is not recorded."}</strong>{" "}
            {data.organicUsers} farmers ({data.organicPct}%) reported at least one organic input.
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
