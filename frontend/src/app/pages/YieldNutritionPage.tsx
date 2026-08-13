import { useEffect, useMemo, useState } from "react";
import {
  ComposedChart, Bar, Line, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from "recharts";
import { getYieldPageData, getAnalyticsRaw, YieldPageData, AnalyticsRow } from "../lib/api";
import { DataTable } from "../components/DataTable";
import { PageHeader, KPITile, ChartCard, ChartTooltip, axisTick, useChartHover, comboDot } from "./PageKit";

type YieldRecord = { surveyId: number; name: string; village: string; acres: number; yield: number; tna: number };

const N_THRESHOLD = 130; // kg — agronomic cutoff for high nitrogen

const QUADRANTS = [
  { key: "eff", label: "EFFICIENT TARGET",  desc: "High Yield, Low Nitrogen",
    card: "#ECFDF5", badgeBg: "#D0FAE5", badgeText: "#047857", num: "#059669" },
  { key: "exc", label: "EXCESSIVE N",       desc: "High Yield, High Nitrogen",
    card: "#FFFBEB", badgeBg: "#FEF3C6", badgeText: "#92400E", num: "#B45309" },
  { key: "und", label: "UNDER-FERTILIZED",  desc: "Low Yield, Low Nitrogen",
    card: "#F8FAFC", badgeBg: "#1F2937", badgeText: "#F8FAFC", num: "#1E293B" },
  { key: "cri", label: "CRITICAL OUTLIERS", desc: "Low Yield, High Nitrogen",
    card: "#FEF2F2", badgeBg: "#FFE2E2", badgeText: "#B91C1C", num: "#DC2626" },
] as const;

function EfficiencyQuadrants({
  rows, yieldSplit, nSplit,
}: { rows: AnalyticsRow[]; yieldSplit: number; nSplit: number }) {
  const counts = useMemo(() => {
    const c = { eff: 0, exc: 0, und: 0, cri: 0 };
    for (const r of rows) {
      const hiY = r.yield >= yieldSplit;
      const hiN = r.n >= nSplit;
      if (hiY && !hiN) c.eff++;
      else if (hiY && hiN) c.exc++;
      else if (!hiY && !hiN) c.und++;
      else c.cri++;
    }
    return c;
  }, [rows, yieldSplit, nSplit]);

  return (
    <div className="glass-card-master p-4 h-[280px] flex flex-col">
      <h3 className="text-[13px] font-semibold leading-tight" style={{ color: "var(--ink)" }}>
        Yield vs Nitrogen Efficiency
      </h3>
      <p className="text-[10.5px] mt-0.5 mb-2.5" style={{ color: "var(--ink)", opacity: 0.5 }}>
        Split at avg yield {yieldSplit.toFixed(1)} t/ha · N threshold {nSplit} kg
      </p>

      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        {QUADRANTS.map((q) => (
          <div
            key={q.key}
            className="rounded-xl px-2.5 py-2 flex flex-col justify-between min-h-0"
            style={{ background: q.card, border: "1px solid rgba(12,32,18,0.05)" }}
          >
            <div className="min-h-0">
              <span
                className="inline-block px-1.5 py-[2px] rounded-md text-[7.5px] font-bold tracking-wide"
                style={{ background: q.badgeBg, color: q.badgeText }}
              >
                {q.label}
              </span>
              <p className="text-[9.5px] mt-1 leading-tight" style={{ color: "#64748B" }}>
                {q.desc}
              </p>
            </div>
            <div className="text-[19px] font-bold leading-none" style={{ color: q.num }}>
              {counts[q.key]}
              <span className="text-[10.5px] font-semibold ml-1">Farms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function YieldNutritionPage({ onRowClick }: { onRowClick: (id: number) => void }) {
  const [data, setData] = useState<YieldPageData | null>(null);
  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getYieldPageData(), getAnalyticsRaw()])
      .then(([y, a]) => { if (!cancelled) { setData(y); setAnalyticsRows(a); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const validRows = useMemo(() => (analyticsRows ?? []).filter((r) => (r.yield || 0) > 0 && (r.n || 0) > 0), [analyticsRows]);

  const topFarmers = useMemo(() => [...validRows].sort((a, b) => b.yield - a.yield).slice(0, 5), [validRows]);
  const outliers = useMemo(() => {
    if (!data) return [];
    return [...validRows]
      .filter((r) => r.n > N_THRESHOLD && r.yield < data.avgYield)
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [validRows, data]);

  const nitrogenBars = useChartHover(data?.comboData.length ?? 0);
  const scatterHover = useChartHover(data?.scatterData.length ?? 0, 1.35);

  if (!data) return <div className="p-8" style={{ color: "var(--ink)", opacity: 0.5 }}>Loading yield &amp; nutrition data...</div>;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="DEEP DIVE"
        title="Yield & Nutrition"
        subtitle="Nitrogen application patterns against realized cane yield per farmer."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPITile value={data.avgYield} unit="t/ha" label="Avg Yield" delay={0} />
        <KPITile value={data.avgN} unit="kg N" label="Avg TNA" delay={0.04} />
        <KPITile value={data.maxYield} unit="t/ha" label="Max Yield Recorded" delay={0.08} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <EfficiencyQuadrants rows={validRows} yieldSplit={data.avgYield} nSplit={N_THRESHOLD} />

        <ChartCard title="Nitrogen Applied vs Average Yield" subtitle="Bucketed by TNA (kg)" className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <ComposedChart data={data.comboData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }}/>
              <Bar yAxisId="left" dataKey="Farmers" fill="var(--gold-soft)" radius={[3, 3, 0, 0]} maxBarSize={32}>
                {nitrogenBars.cells}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="AvgYield" name="Avg Yield (t/ha)" stroke="var(--olive)" strokeWidth={2.5} dot={comboDot(nitrogenBars)} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Plot Size vs Yield" subtitle="Scatter across surveyed plots" className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <ScatterChart margin={{ left: -20 }}>
              <CartesianGrid stroke="var(--hairline)" />
              <XAxis type="number" dataKey="acres" name="Acres" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="yield" name="Yield (t/ha)" tick={axisTick} axisLine={false} tickLine={false} />
              <ReTooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltip />} />
              <Scatter data={data.scatterData} fill="var(--steel)" opacity={0.7}>
                {scatterHover.cells}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <DataTable<YieldRecord>
        title="Yield & Nutrition Records"
        data={data.records}
        searchFields={(r) => `${r.name} ${r.village}`}
        onRowClick={(r) => r.surveyId && onRowClick(r.surveyId)}
        columns={[
          { header: "Name", accessor: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Village", accessor: (r) => r.village },
          { header: "Plot Size (Acres)", align: "right", accessor: (r) => r.acres },
          { header: "Yield (t/ha)", align: "right", accessor: (r) => r.yield || "–" },
          { header: "TNA (kg)", align: "right", accessor: (r) => r.tna || "–" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card-master p-5">
          <h3 className="text-[15px] font-semibold mb-3" style={{ color: "var(--ink)" }}>Leaderboard — High Productivity Farmers</h3>
          <div className="space-y-2">
            {topFarmers.map((f, i) => (
              <button
                key={f.surveyId}
                onClick={() => onRowClick(f.surveyId)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors"
                style={{ border: "1px solid var(--hairline)" }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-bold w-4 shrink-0" style={{ color: "var(--ink)", opacity: 0.4 }}>#{i + 1}</span>
                  <div className="min-w-0">
                    <span className="text-[12.5px] font-semibold block truncate" style={{ color: "var(--ink)" }}>{f.name}</span>
                    <span className="text-[10.5px] block truncate font-mono" style={{ color: "var(--ink)", opacity: 0.5 }}>{f.id} ({f.village})</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <strong className="block text-[12.5px]" style={{ color: "var(--ink)" }}>{f.yield.toFixed(2)} t/ha</strong>
                  <span className="text-[10.5px]" style={{ color: "var(--gold)" }}>N: {f.n.toFixed(1)} kg/ha</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card-master p-5">
          <h3 className="text-[15px] font-semibold mb-3" style={{ color: "var(--clay)" }}>Critical Nitrogen Inefficiency Outliers</h3>
          <div className="space-y-2">
            {outliers.length === 0 && <p className="text-[12px] italic text-center py-6" style={{ color: "var(--ink)", opacity: 0.4 }}>No outliers found.</p>}
            {outliers.map((f) => (
              <button
                key={f.surveyId}
                onClick={() => onRowClick(f.surveyId)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors"
                style={{ border: "1px solid rgba(186,98,84,0.3)", background: "rgba(186,98,84,0.06)" }}
              >
                <div className="min-w-0">
                  <span className="text-[12.5px] font-semibold block truncate" style={{ color: "var(--clay)" }}>{f.name}</span>
                  <span className="text-[10.5px] block truncate font-mono" style={{ color: "var(--clay)", opacity: 0.7 }}>{f.id} ({f.village})</span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <strong className="block text-[12.5px]" style={{ color: "var(--clay)" }}>{f.n.toFixed(1)} kg N/ha</strong>
                  <span className="text-[10.5px]" style={{ color: "var(--clay)", opacity: 0.7 }}>Yield: {f.yield.toFixed(1)} t/ha</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}