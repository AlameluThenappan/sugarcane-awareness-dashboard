import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getSummary, getVillageData, getYieldPageData, getQuadrantOverview, getAnalyticsRaw,
  SummaryStats, YieldPageData, QuadrantKey, QuadrantOverview, AnalyticsRow,
} from "../lib/api";
import dashboardBg from "../../assets/dashboard-bg-web.mp4";
import { KPITile, ChartCard, ChartTooltip, nf, useChartHover } from "./PageKit";
import { EfficiencyQuadrants } from "./EfficiencyQuadrants";
import { QuadrantInsightsOverlay } from "../components/QuadrantInsightsOverlay";
import { fallbackQuadrantOverview } from "../data/quadrantFallback";

type VillageRow = { village: string; block: string; farmers: number; acres: number; yield: number; tna: number };

export function OverviewPage({ onSelectFarmer }: { onSelectFarmer: (surveyId: number) => void }) {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [villages, setVillages] = useState<VillageRow[] | null>(null);
  const [yieldPage, setYieldPage] = useState<YieldPageData | null>(null);
  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsRow[]>([]);
  const [quadrantOverview, setQuadrantOverview] = useState<QuadrantOverview | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSummary(), getVillageData(), getYieldPageData(), getAnalyticsRaw()])
      .then(([sum, vill, yp, analytics]) => {
        if (cancelled) return;
        setSummary(sum);
        setVillages(vill as VillageRow[]);
        setYieldPage(yp);
        setAnalyticsRows(analytics);
      })
      .catch(() => {});
    // Always try the live shared-classification RPC first, in both dev and
    // prod — falling back to the bundled static snapshot only if it's
    // genuinely unreachable. A DEV-only fallback here previously showed a
    // different (stale, pre-backfill) farmer count than the always-live
    // outside card, and that drift is exactly what the shared
    // quadrant_classification source was built to prevent.
    getQuadrantOverview()
      .then((quadrantData) => { if (!cancelled) setQuadrantOverview(quadrantData); })
      .catch(() => { if (!cancelled) setQuadrantOverview(fallbackQuadrantOverview()); });
    return () => { cancelled = true; };
  }, []);

  // same filter the Yield & Nutrition page applies
  // same source the Yield & Nutrition page uses â€” 114.6, not summary's 116.3
  const yieldSplit = quadrantOverview?.yieldSplit ?? yieldPage?.avgYield ?? 0;
  const nThreshold = quadrantOverview?.nThreshold ?? 130;

  const topFarmerVillages = useMemo(
    () => (villages ?? []).slice().sort((a, b) => b.farmers - a.farmers).slice(0, 8),
    [villages]
  );

  const blockCoverage = useMemo(() => {
    const map = new Map<string, { block: string; villages: Set<string>; farmers: number; acres: number }>();
    for (const v of villages ?? []) {
      const entry = map.get(v.block) ?? { block: v.block, villages: new Set<string>(), farmers: 0, acres: 0 };
      entry.villages.add(v.village);
      entry.farmers += v.farmers;
      entry.acres += v.acres;
      map.set(v.block, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.farmers - a.farmers);
  }, [villages]);

  // matches the CRITICAL OUTLIERS quadrant: same rows, same split, same >= on nitrogen
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const avgNitrogen = Number(summary?.avgNitrogen);
  const safeAvgNitrogen = Number.isFinite(avgNitrogen) ? avgNitrogen : 0;

  const farmerBars = useChartHover(topFarmerVillages.length);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <p className="eyebrow mb-1">OVERVIEW</p>
          <h1 className="text-[26px] font-semibold" style={{ color: "var(--ink)" }}>Overview</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--ink)", opacity: 0.6 }}>
            EDF Sugarcane Survey â€” Erode District, Tamil Nadu
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-pill">{today}</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: "var(--ink)", color: "var(--canvas)" }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--sage)" }} />
            LIVE
          </span>
        </div>
      </div>

      {/* Hero card */}
      <div className="glass-card-master relative overflow-hidden h-[280px]">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" src={dashboardBg} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(30,38,24,0.62) 0%, rgba(30,38,24,0.15) 60%, transparent 100%)" }} />
        <div className="relative z-10 h-full flex flex-col justify-end p-6 max-w-lg">
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-2" style={{ color: "rgba(245,247,242,0.85)" }}>
            Environmental Defense Fund
          </p>
          <h2 className="text-[26px] font-semibold leading-tight mb-1.5" style={{ color: "#F5F7F2" }}>Sugarcane Analytics Platform</h2>
          <p className="text-[13px]" style={{ color: "rgba(245,247,242,0.75)" }}>Data-driven Agricultural Intelligence</p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPITile value={nf.format(summary?.totalFarmers ?? 0)} label="Total Farmers" delay={0} />
        <KPITile value={nf.format(Math.round(summary?.totalAcres ?? 0))} unit="ac" label="Total Acreage" delay={0.04} />
        <KPITile value={`${summary?.avgYield ?? 0}`} unit="t/ha" label="Average Yield" delay={0.08} />
        <KPITile value={safeAvgNitrogen.toFixed(2)} unit="kg" label="Avg Nitrogen" delay={0.12} />
        <KPITile value={`${summary?.ratoonPct ?? 0}%`} unit="Ratoon" label="Crop Split" delay={0.16} />
        <KPITile value={`${summary?.stressedYearPct ?? 0}%`} unit="Stressed" label="Climate Impact" delay={0.2} />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EfficiencyQuadrants
          overview={quadrantOverview}
          fallbackRows={analyticsRows}
          fallbackYieldSplit={yieldPage?.avgYield ?? 0}
          onSelect={setSelectedQuadrant}
        />

        <ChartCard title="Production Overview" subtitle="Top villages by farmer count" className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={topFarmerVillages} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="village" tick={{ fill: "var(--ink)", fontSize: 9, opacity: 0.45 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "var(--ink)", fontSize: 10, opacity: 0.45 }} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="farmers" name="Farmers" fill="var(--gold-soft)" radius={[3, 3, 0, 0]}>
                {farmerBars.cells}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Survey Activity + Nitrogen Watch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card-master p-5">
          <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--ink)" }}>Survey Activity</h3>
          <p className="text-[12px] mb-3" style={{ color: "var(--ink)", opacity: 0.55 }}>Coverage by block</p>
          <div className="space-y-0">
            {blockCoverage.map((b) => (
              <div key={b.block} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
                <span className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>{b.block} Block</span>
                <div className="flex gap-4 text-[12px] table-cell-numeric" style={{ color: "var(--ink)", opacity: 0.7 }}>
                  <span>{b.villages.size} villages</span>
                  <span>{nf.format(b.farmers)} farmers</span>
                  <span>{nf.format(Math.round(b.acres))} ac</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-3" style={{ color: "var(--ink)", opacity: 0.45 }}>
            {summary?.pendingAcknowledgementCount ?? 0} surveys awaiting acknowledgement
          </p>
        </div>

        <div className="glass-card-master p-5">
          <h3 className="text-[15px] font-semibold mb-0.5" style={{ color: "var(--ink)" }}>Nitrogen Watch</h3>
          <p className="text-[12px] mb-4" style={{ color: "var(--ink)", opacity: 0.55 }}>EDF analytics threshold: {nThreshold} kg N</p>
          {(() => {
            const avgN = safeAvgNitrogen;
            const maxScale = Math.max(nThreshold * 1.4, avgN * 1.2);
            const pct = Math.min(100, (avgN / maxScale) * 100);
            const thresholdPct = Math.min(100, (nThreshold / maxScale) * 100);
            const overThreshold = avgN > nThreshold;
            return (
              <div className="relative h-3 rounded-full mt-6 mb-2" style={{ background: "var(--hairline)" }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${pct}%`, background: overThreshold ? "var(--clay)" : "var(--sage)" }}
                />
                <div
                  className="absolute -top-5 flex flex-col items-center"
                  style={{ left: `${thresholdPct}%`, transform: "translateX(-50%)" }}
                >
                  <span className="text-[10px] font-semibold" style={{ color: "var(--ink)", opacity: 0.6 }}>{nThreshold}</span>
                  <span className="w-px h-3" style={{ background: "var(--ink)", opacity: 0.3 }} />
                </div>
              </div>
            );
          })()}
          <div className="flex items-center justify-between mt-3">
            <p className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
              {safeAvgNitrogen} kg avg farm
            </p>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: safeAvgNitrogen > nThreshold ? "var(--clay)" : "var(--sage)",
                background: safeAvgNitrogen > nThreshold ? "rgba(186,98,84,0.12)" : "rgba(67,112,83,0.12)",
              }}
            >
              {safeAvgNitrogen > nThreshold ? "Above threshold" : "Within threshold"}
            </span>
          </div>
        </div>
      </div>

      {selectedQuadrant && (
        <QuadrantInsightsOverlay
          quadrant={selectedQuadrant}
          onClose={() => setSelectedQuadrant(null)}
          onSelectFarmer={onSelectFarmer}
        />
      )}
    </div>
  );
}
