import { useEffect, useMemo, useState } from "react";
import { Leaf } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie,
} from "recharts";
import {
  getSummary, getAnalyticsRaw, getVillageData, getYieldPageData,
  SummaryStats, AnalyticsRow, YieldPageData,
} from "../lib/api";
import dashboardBg from "../../assets/dashboard-bg-web.mp4";
import { KPITile, ChartCard, ChartTooltip, nf, useChartHover, usePieHover } from "./PageKit";

const N_THRESHOLD = 130;

type VillageRow = { village: string; block: string; farmers: number; acres: number; yield: number; tna: number };

export function OverviewPage({ onSelectFarmer }: { onSelectFarmer: (surveyId: number) => void }) {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsRow[] | null>(null);
  const [villages, setVillages] = useState<VillageRow[] | null>(null);
  const [yieldPage, setYieldPage] = useState<YieldPageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSummary(), getAnalyticsRaw(), getVillageData(), getYieldPageData()])
      .then(([sum, raw, vill, yp]) => {
        if (cancelled) return;
        setSummary(sum);
        setAnalyticsRows(raw);
        setVillages(vill as VillageRow[]);
        setYieldPage(yp);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // same filter the Yield & Nutrition page applies
  const validRows = useMemo(
    () => (analyticsRows ?? []).filter((r) => (r.yield || 0) > 0 && (r.n || 0) > 0),
    [analyticsRows]
  );

  // same source the Yield & Nutrition page uses — 114.6, not summary's 116.3
  const yieldSplit = yieldPage?.avgYield ?? 0;

  const topYieldVillages = useMemo(
    () => (villages ?? []).slice().sort((a, b) => b.yield - a.yield).slice(0, 10)
      .map((v) => ({ ...v, label: v.village })),
    [villages]
  );

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
  const outlierCount = useMemo(() => {
    if (!validRows.length || !yieldSplit) return null;
    return validRows.filter((r) => r.n >= N_THRESHOLD && r.yield < yieldSplit).length;
  }, [validRows, yieldSplit]);

  const ackPct = summary ? Math.round((summary.acknowledgedCount / Math.max(summary.totalSurveys, 1)) * 100) : 0;
  const ringCircumference = 2 * Math.PI * 42;
  const ringOffset = ringCircumference * (1 - ackPct / 100);

  const climateData = summary
    ? [
        { name: "Normal Year", value: summary.normalYearPct, fill: "var(--sage)" },
        { name: "Stressed", value: summary.stressedYearPct, fill: "var(--clay-soft)" },
      ]
    : [];

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const yieldBars = useChartHover(topYieldVillages.length);
  const farmerBars = useChartHover(topFarmerVillages.length);
  const climatePie = usePieHover(climateData.map((d) => d.value), climateData.map((d) => d.fill));

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <p className="eyebrow mb-1">OVERVIEW</p>
          <h1 className="text-[26px] font-semibold" style={{ color: "var(--ink)" }}>Overview</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--ink)", opacity: 0.6 }}>
            EDF Sugarcane Survey — Erode District, Tamil Nadu
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
        <KPITile value={`${summary?.avgNitrogen ?? 0}`} unit="kg" label="Avg Nitrogen" delay={0.12} />
        <KPITile value={`${summary?.ratoonPct ?? 0}%`} unit="Ratoon" label="Crop Split" delay={0.16} />
        <KPITile value={`${summary?.stressedYearPct ?? 0}%`} unit="Stressed" label="Climate Impact" delay={0.2} />
      </div>

      {/* Acknowledgement + Village Yield Landscape */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card-master p-5 flex flex-col items-center justify-center">
          <h3 className="text-[15px] font-semibold self-start mb-2" style={{ color: "var(--ink)" }}>Survey Acknowledgement</h3>
          <svg width="120" height="120" viewBox="0 0 100 100" className="my-2" role="img" aria-label={`${ackPct}% of surveys acknowledged`}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--hairline)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none" stroke="var(--sage)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--ink)">{ackPct}%</text>
          </svg>
          <p className="text-[12px] text-center" style={{ color: "var(--ink)", opacity: 0.6 }}>
            {summary?.acknowledgedCount ?? 0} of {summary?.totalSurveys ?? 0} surveys acknowledged · {summary?.pendingAcknowledgementCount ?? 0} pending
          </p>
          <div className="flex gap-4 mt-3 text-[12px]" style={{ color: "var(--ink)" }}>
            <span>{summary?.villageCount ?? 0} Villages</span>
            <span>{summary?.blockCount ?? 0} Blocks</span>
          </div>
        </div>

        <ChartCard title="Village Yield Landscape" subtitle="Top 10 villages by average yield" className="lg:col-span-2 h-[300px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={topYieldVillages} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke="var(--hairline)" />
              <XAxis type="number" tick={{ fill: "var(--ink)", fontSize: 10, opacity: 0.45 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={90} tick={{ fill: "var(--ink)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="yield" name="Avg Yield (t/ha)" fill="var(--olive)" radius={[0, 3, 3, 0]} barSize={12}>
                {yieldBars.cells}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Production Overview + Climate donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Production Overview" subtitle="Top villages by farmer count" className="h-[260px]">
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

        <ChartCard title="Climate Impact" subtitle="Share of surveyed years" className="h-[260px]">
          <div className="h-full flex items-center gap-4">
            <ResponsiveContainer width="55%" height="100%" debounce={50}>
              <PieChart>
                <Pie data={climateData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {climatePie.cells}
                </Pie>
                <ReTooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-[12px]">
              {climateData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                  <span style={{ color: "var(--ink)" }}>{d.name} {d.value}%</span>
                </div>
              ))}
            </div>
          </div>
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
          <p className="text-[12px] mb-4" style={{ color: "var(--ink)", opacity: 0.55 }}>EDF analytics threshold: {N_THRESHOLD} kg N</p>
          {(() => {
            const avgN = summary?.avgNitrogen ?? 0;
            const maxScale = Math.max(N_THRESHOLD * 1.4, avgN * 1.2);
            const pct = Math.min(100, (avgN / maxScale) * 100);
            const thresholdPct = Math.min(100, (N_THRESHOLD / maxScale) * 100);
            const overThreshold = avgN > N_THRESHOLD;
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
                  <span className="text-[10px] font-semibold" style={{ color: "var(--ink)", opacity: 0.6 }}>{N_THRESHOLD}</span>
                  <span className="w-px h-3" style={{ background: "var(--ink)", opacity: 0.3 }} />
                </div>
              </div>
            );
          })()}
          <div className="flex items-center justify-between mt-3">
            <p className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
              {summary?.avgNitrogen ?? 0} kg avg farm
            </p>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: (summary?.avgNitrogen ?? 0) > N_THRESHOLD ? "var(--clay)" : "var(--sage)",
                background: (summary?.avgNitrogen ?? 0) > N_THRESHOLD ? "rgba(186,98,84,0.12)" : "rgba(67,112,83,0.12)",
              }}
            >
              {(summary?.avgNitrogen ?? 0) > N_THRESHOLD ? "Above threshold" : "Within threshold"}
            </span>
          </div>
        </div>
      </div>

      {/* EDF Agronomy insight card */}
      <div className="rounded-2xl p-6" style={{ background: "var(--surface-emphasis)" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] uppercase tracking-[0.14em] font-semibold" style={{ color: "var(--gold-soft)" }}>EDF Agronomy</span>
        </div>
        <p className="text-[19px] font-medium leading-snug max-w-2xl" style={{ color: "#F5F7F2" }}>
          {outlierCount ?? "—"} farms apply &gt;{N_THRESHOLD} kg N yet stay under {yieldSplit ? yieldSplit.toFixed(1) : "—"} t/ha. Where should EDF prioritise training?
        </p>
        <div className="h-px my-4 max-w-2xl" style={{ background: "rgba(245,247,242,0.15)" }} />
        <p className="text-[11px] uppercase tracking-[0.1em] font-semibold mb-1.5" style={{ color: "rgba(245,247,242,0.6)" }}>
          EDF Agronomic Recommendation
        </p>
        <p className="text-[14px] leading-relaxed max-w-2xl mb-4" style={{ color: "rgba(245,247,242,0.85)" }}>
          Prioritize training intervention for the {outlierCount ?? "critical outlier"} farms where nitrogen application is high but crop yields remain depressed.
        </p>
        <button
          onClick={() => (window.location.hash = "#/yield_nutrition")}
          className="text-[13px] font-medium"
          style={{ color: "var(--gold-soft)" }}
        >
          View analytics →
        </button>
      </div>
    </div>
  );
}