import { useEffect, useState } from "react";
import {
  BarChart, Bar, ComposedChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from "recharts";
import { getLandPageData, getRatoonPageData, LandPageData, RatoonPageData } from "../lib/api";
import { DataTable } from "../components/DataTable";
import { PageHeader, KPITile, ChartCard, ChartTooltip, axisTick, CHART_COLORS, useChartHover, comboDot, usePieHover } from "./PageKit";

type LandRecord = { surveyId: number; name: string; village: string; largestPlotAcres: number | null; landAreaHa: number | null };
type RatoonRecord = { surveyId: number; name: string; village: string; crop: string; wishNextRatoon: string };

function CropChip({ crop }: { crop: string }) {
  const isRatoon = crop === "Ratoon";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium"
      style={{
        background: isRatoon ? "rgba(67,112,83,0.12)" : "rgba(168,147,102,0.14)",
        color: isRatoon ? "var(--sage)" : "var(--ink-2)",
      }}
    >
      {crop}
    </span>
  );
}

function AnswerChip({ answer }: { answer: string }) {
  const isYes = answer === "Yes";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium"
      style={{
        background: isYes ? "rgba(67,112,83,0.12)" : "rgba(186,98,84,0.12)",
        color: isYes ? "var(--sage)" : "var(--clay)",
      }}
    >
      {answer || "–"}
    </span>
  );
}

export function LandDetailsPage({ onRowClick }: { onRowClick: (id: number) => void }) {
  const [data, setData] = useState<LandPageData | null>(null);
  const [ratoon, setRatoon] = useState<RatoonPageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getLandPageData(), getRatoonPageData()])
      .then(([d, r]) => { if (!cancelled) { setData(d); setRatoon(r); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const acreageBars = useChartHover(data?.yieldIrrData.length ?? 0);
  const distBars = useChartHover(data?.yieldDistData.length ?? 0);
  const irrigationPie = usePieHover(
    data?.yieldIrrData.map((d) => d.Farmers) ?? [],
    data?.yieldIrrData.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]) ?? [],
  );

  if (!data || !ratoon) return <div className="p-8" style={{ color: "var(--ink)", opacity: 0.5 }}>Loading land data...</div>;

  const irrigationDonut = data.yieldIrrData.map((d) => ({ name: d.name, value: d.Farmers }));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="DEEP DIVE"
        title="Land Detail"
        subtitle="Plot sizes, irrigation methods and land area under sugarcane."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPITile value={Math.round(data.totalAcres).toLocaleString("en-IN")} unit="ac" label="Total Acreage" delay={0} />
        <KPITile value={data.avgPlot} unit="ac" label="Avg Plot Size" delay={0.04} />
        <KPITile value={data.avgYield} unit="t/ha" label="Avg Yield" delay={0.08} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Irrigation Method" className="h-[280px]">
          <div className="h-full flex items-center gap-3">
            <ResponsiveContainer width="55%" height="100%" debounce={50}>
              <PieChart>
                <Pie data={irrigationDonut} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {irrigationPie.cells}
                </Pie>
                <ReTooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 text-[10.5px]" style={{ color: "var(--ink)" }}>
              {irrigationDonut.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="truncate">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Acreage vs Yield"
          legend={<span className="text-[10px]" style={{ color: "var(--ink)", opacity: 0.5 }}>● Total Acres&nbsp;&nbsp;● Avg Yield (t/ha)</span>}
          className="h-[280px]"
        >
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <ComposedChart data={data.yieldIrrData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
              <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar yAxisId="left" dataKey="TotalAcres" name="Total Acres" fill="var(--steel)" radius={[3, 3, 0, 0]} maxBarSize={28}>
                {acreageBars.cells}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="AvgYield" name="Avg Yield (t/ha)" stroke="var(--olive)" strokeWidth={2.5} dot={comboDot(acreageBars)} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Yield Distribution" className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={data.yieldDistData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="value" name="Farmers" fill="var(--clay-soft)" radius={[3, 3, 0, 0]}>
                {distBars.cells}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <DataTable<LandRecord>
        title="Land Records"
        data={data.records}
        searchFields={(r) => `${r.name} ${r.village}`}
        onRowClick={(r) => r.surveyId && onRowClick(r.surveyId)}
        columns={[
          { header: "Name", accessor: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Village", accessor: (r) => r.village },
          { header: "Size of Largest Plot (Acres)", align: "right", accessor: (r) => r.largestPlotAcres ?? "–" },
          { header: "Land Area (Ha)", align: "right", accessor: (r) => r.landAreaHa ?? "–" },
        ]}
      />

      <DataTable<RatoonRecord>
        title="Ratoon Records"
        data={ratoon.records}
        searchFields={(r) => `${r.name} ${r.village}`}
        onRowClick={(r) => r.surveyId && onRowClick(r.surveyId)}
        columns={[
          { header: "Name", accessor: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Village", accessor: (r) => r.village },
          { header: "Current Crop", accessor: (r) => <CropChip crop={r.crop} /> },
          { header: "Wish to go for next Ratoon?", accessor: (r) => <AnswerChip answer={r.wishNextRatoon} /> },
        ]}
      />
    </div>
  );
}
