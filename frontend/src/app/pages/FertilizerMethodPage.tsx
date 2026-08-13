import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import {
  getFertilizerPageData, getLongTailFertPageData, getLongTailOrgPageData,
  FertilizerPageData, LongTailFertPageData, LongTailOrgPageData,
} from "../lib/api";
import { DataTable } from "../components/DataTable";
import { PageHeader, KPITile, ChartCard, ChartTooltip, axisTick, nf, useChartHover } from "./PageKit";

type MethodRecord = { surveyId: number; name: string; village: string; method: string };
type OrgRecord = { surveyId: number; name: string; vermicompost: number | null; goatSheepManure: number | null; poultryManure: number | null; jeevamrut: number | null };

function MethodChips({ method }: { method: string }) {
  const parts = (method || "Unknown").split(/[,/&]|\s+(?=[A-Z])/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((p) => (
        <span
          key={p}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium"
          style={{ background: "var(--primary-surface)", color: "var(--ink-2)" }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

function cell(v: number | null | undefined) {
  return v == null || v === 0
    ? <span style={{ opacity: 0.35 }}>–</span>
    : <>{v}</>;
}

export function FertilizerMethodPage({ onRowClick }: { onRowClick: (id: number) => void }) {
  const [method, setMethod] = useState<FertilizerPageData | null>(null);
  const [fert, setFert] = useState<LongTailFertPageData | null>(null);
  const [org, setOrg] = useState<LongTailOrgPageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getFertilizerPageData(), getLongTailFertPageData(), getLongTailOrgPageData()])
      .then(([m, f, o]) => { if (!cancelled) { setMethod(m); setFert(f); setOrg(o); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const fertBars = useChartHover(fert?.chartData.length ?? 0);
  const orgBars = useChartHover(org?.chartData.length ?? 0);

  if (!method || !fert || !org) return <div className="p-8" style={{ color: "var(--ink)", opacity: 0.5 }}>Loading fertilizer method data...</div>;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="DEEP DIVE"
        title="Fertilizer Method"
        subtitle="Application methodology, plus secondary fertilizers and organic input usage beyond the core three."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile value={fert.top} label="Most Used Fertilizer" delay={0} />
        <KPITile value={org.top} label="Most Used Organic" delay={0.04} />
        <KPITile value={fert.usingAny} label="Farmers Using Fertilizers" delay={0.08} />
        <KPITile value={nf.format(Math.round(org.vol / 1000))} unit="t" label="Total Organic Volume" delay={0.12} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Fertilizer Usage" subtitle="Farmers using" className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={fert.chartData} margin={{ left: -20, bottom: 20 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 9 }} interval={0} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="value" name="Farmers" fill="var(--clay-soft)" radius={[3, 3, 0, 0]}>
                {fertBars.cells}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Organics Usage" subtitle="Farmers using" className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={org.chartData} margin={{ left: -20, bottom: 20 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 9 }} interval={0} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="value" name="Farmers" fill="var(--sage)" radius={[3, 3, 0, 0]}>
                {orgBars.cells}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <DataTable<MethodRecord>
        title="Method Records"
        data={method.records}
        searchFields={(r) => `${r.name} ${r.village} ${r.method}`}
        onRowClick={(r) => r.surveyId && onRowClick(r.surveyId)}
        columns={[
          { header: "Name", accessor: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Village", accessor: (r) => r.village },
          { header: "Method", accessor: (r) => <MethodChips method={r.method} /> },
        ]}
      />

      <DataTable<Record<string, any>>
        title="Fertilizer Usage Records (Kg)"
        data={fert.records}
        searchFields={(r) => `${r.name}`}
        onRowClick={(r) => r.surveyId && onRowClick(r.surveyId)}
        columns={[
          { header: "Name", accessor: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "SSP", align: "right", accessor: (r) => cell(r["SSP"]) },
          { header: "NPK 10-26-26", align: "right", accessor: (r) => cell(r["NPK 10-26-26"]) },
          { header: "Amm. Sulphate", align: "right", accessor: (r) => cell(r["Amm. Sulphate"]) },
          { header: "NPK 17-17-17", align: "right", accessor: (r) => cell(r["NPK 17-17-17"]) },
          { header: "CAN", align: "right", accessor: (r) => cell(r["CAN"]) },
        ]}
      />

      <DataTable<OrgRecord>
        title="Organic Usage Records (Kg)"
        data={org.records}
        searchFields={(r) => `${r.name}`}
        onRowClick={(r) => r.surveyId && onRowClick(r.surveyId)}
        columns={[
          { header: "Name", accessor: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Vermicompost", align: "right", accessor: (r) => cell(r.vermicompost) },
          { header: "Goat/Sheep Manure", align: "right", accessor: (r) => cell(r.goatSheepManure) },
          { header: "Poultry Manure", align: "right", accessor: (r) => cell(r.poultryManure) },
          { header: "Jeevamrut", align: "right", accessor: (r) => cell(r.jeevamrut) },
        ]}
      />
    </div>
  );
}
