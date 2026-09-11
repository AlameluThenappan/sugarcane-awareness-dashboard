import { useEffect, useState } from "react";
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import { getClimatePageData, getSummary, ClimatePageData, SummaryStats } from "../lib/api";
import { DataTable } from "../components/DataTable";
import { PageHeader, KPITile, ChartCard, ChartTooltip, axisTick, useChartHover, usePieHover } from "./PageKit";

type ClimateRecord = { surveyId: number; name: string; village: string; severeEvents: string; growthStage: string };

export function ClimateDetailsPage({ onRowClick }: { onRowClick: (id: number) => void }) {
  const [data, setData] = useState<ClimatePageData | null>(null);
  const [summary, setSummary] = useState<SummaryStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getClimatePageData(), getSummary()])
      .then(([climateData, summaryData]) => {
        if (cancelled) return;
        setData(climateData);
        setSummary(summaryData);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const eventBars = useChartHover(data?.evData.length ?? 0);
  const stageBars = useChartHover(data?.stData.length ?? 0);
  // Kept identical to the former Overview Climate Impact chart: summary percentages and colours.
  const climateData = summary
    ? [
        { name: "Normal Year", value: summary.normalYearPct, fill: "var(--sage)" },
        { name: "Stressed", value: summary.stressedYearPct, fill: "var(--clay-soft)" },
      ]
    : [];
  const climatePie = usePieHover(climateData.map((d) => d.value), climateData.map((d) => d.fill));

  if (!data || !summary) return <div className="p-8" style={{ color: "var(--ink)", opacity: 0.5 }}>Loading climate detail data...</div>;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="DEEP DIVE"
        title="Climate Detail"
        subtitle="Severe weather exposure and growth stages impacted."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPITile value={`${data.pctNormal}%`} label="% Normal Year" delay={0} />
        <KPITile value={`${100 - data.pctNormal}%`} label="% Stressed Year" delay={0.04} />
        <KPITile value={data.topStress} label="Top Stressor" delay={0.08} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Climate Impact" subtitle="Share of surveyed years" className="h-[280px]">
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

        <ChartCard title="Severe Climate Events" className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={data.evData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 600]} tick={axisTick} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="value" name="Reports" fill="var(--clay-soft)" radius={[3, 3, 0, 0]}>
                {eventBars.cells}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Growth Stage Impacted" className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={data.stData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid horizontal={false} stroke="var(--hairline)" />
              <XAxis type="number" domain={[0, 40]} tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="value" name="Reports" fill="var(--sage)" radius={[0, 3, 3, 0]} barSize={14}>
                {stageBars.cells}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <DataTable<ClimateRecord>
        title="Climate Records"
        data={data.records}
        searchFields={(r) => `${r.name} ${r.village} ${r.severeEvents}`}
        onRowClick={(r) => r.surveyId && onRowClick(r.surveyId)}
        columns={[
          { header: "Name", accessor: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Village", accessor: (r) => r.village },
          {
            header: "Severe Climatic Events",
            accessor: (r) => {
              const isSevere = !!r.severeEvents && r.severeEvents !== "None";
              return (
                <span style={{ color: isSevere ? "var(--clay)" : "var(--ink)", opacity: isSevere ? 1 : 0.6 }} className="font-medium">
                  {r.severeEvents || "None"}
                </span>
              );
            },
          },
          { header: "Growth Stage Impacted", accessor: (r) => r.growthStage || "–" },
        ]}
      />
    </div>
  );
}
