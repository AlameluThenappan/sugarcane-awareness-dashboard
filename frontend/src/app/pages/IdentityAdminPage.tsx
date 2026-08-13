import { useEffect, useState } from "react";
import {
  BarChart, Bar, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from "recharts";
import { getIdentityPageData, IdentityPageData } from "../lib/api";
import { DataTable } from "../components/DataTable";
import { PageHeader, KPITile, ChartCard, ChartTooltip, axisTick, useChartHover, comboDot } from "./PageKit";
import { useAuth } from "../context/AuthContext";

function maskMobile(mobile: string | null, canView: boolean): string {
  if (!mobile) return "–";
  if (canView) return mobile;
  const digits = mobile.replace(/\D/g, "");
  if (digits.length < 4) return "••••••••••";
  return `••••••${digits.slice(-4)}`;
}

type IdentityRecord = {
  surveyId: number; farmerCode: string; name: string; mobileNumber: string | null;
  collectionDate: string | null; employee: string | null; village: string; block: string;
};

export function IdentityAdminPage({ onRowClick }: { onRowClick: (id: number) => void }) {
  const { user } = useAuth();
  const canViewMobile = user?.role === "ADMIN";
  const [data, setData] = useState<IdentityPageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getIdentityPageData().then((d) => { if (!cancelled) setData(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const villageBars = useChartHover(data?.villageData.length ?? 0);
  const ageBars = useChartHover(data?.ageData.length ?? 0);
  const eduBars = useChartHover(data?.eduData.length ?? 0);

  if (!data) return <div className="p-8" style={{ color: "var(--ink)", opacity: 0.5 }}>Loading identity &amp; admin data...</div>;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="DEEP DIVE"
        title="Farmer Details"
        subtitle="Farmer identity, contact and survey administration records."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPITile value={data.totalFarmers} label="Total Farmers" delay={0} />
        <KPITile value={data.topVillage} label="Top Village" delay={0.04} />
        <KPITile value={data.topEdu} label="Most Common Education" delay={0.08} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Farmers by Village" subtitle="Top 10" className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={data.villageData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid horizontal={false} stroke="var(--hairline)" />
              <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="value" name="Farmers" fill="var(--olive)" radius={[0, 3, 3, 0]} barSize={10}>
                {villageBars.cells}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Age Distribution" className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={data.ageData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 320]} tick={axisTick} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="value" name="Farmers" fill="var(--gold-soft)" radius={[3, 3, 0, 0]}>
                {ageBars.cells}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Education vs Average Yield" className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <ComposedChart data={data.eduData} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
              <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={axisTick} axisLine={false} tickLine={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "transparent" }} />
              <Bar yAxisId="left" dataKey="Farmers" fill="var(--steel)" radius={[3, 3, 0, 0]} maxBarSize={28}>
                {eduBars.cells}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="AvgYield" name="Avg Yield (t/ha)" stroke="var(--olive)" strokeWidth={2.5} dot={comboDot(eduBars)} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <DataTable<IdentityRecord>
        title="Identity Records"
        data={data.records}
        searchFields={(r) => `${r.name} ${r.farmerCode}`}
        onRowClick={(r) => r.surveyId && onRowClick(r.surveyId)}
        columns={[
          { header: "Farmer Code", accessor: (r) => <span className="font-mono text-xs">{r.farmerCode}</span> },
          { header: "Name", accessor: (r) => <span className="font-semibold">{r.name}</span> },
          { header: "Mobile Number", accessor: (r) => maskMobile(r.mobileNumber, canViewMobile) },
          { header: "Collection Date", accessor: (r) => r.collectionDate || "–" },
          { header: "Employee", accessor: (r) => r.employee || "–" },
          { header: "Village", accessor: (r) => r.village },
          { header: "Block", accessor: (r) => r.block },
        ]}
      />
    </div>
  );
}
