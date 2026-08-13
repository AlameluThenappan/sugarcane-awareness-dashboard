import { useEffect, useMemo, useState } from "react";
import { DistrictMap } from "../components/Map";
import { getSummary, getVillageData, SummaryStats } from "../lib/api";
import { nf } from "./PageKit";

type VillageRow = { village: string; block: string; farmers: number; acres: number; yield: number; tna: number };

export function DistrictMapPage() {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [villages, setVillages] = useState<VillageRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSummary(), getVillageData()])
      .then(([sum, vill]) => {
        if (cancelled) return;
        setSummary(sum);
        setVillages(vill as VillageRow[]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const blockAcres = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of villages ?? []) {
      map.set(v.block, (map.get(v.block) ?? 0) + v.acres);
    }
    return Array.from(map.entries())
      .map(([block, acres]) => ({ block, acres }))
      .sort((a, b) => b.acres - a.acres);
  }, [villages]);

  const totalAcres = useMemo(
    () => blockAcres.reduce((s, b) => s + b.acres, 0),
    [blockAcres]
  );

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const kpis = [
    { value: summary?.villageCount ?? 0, label: "Total Villages", raw: false },
    { value: summary?.blockCount ?? 0, label: "Total Blocks", raw: false },
    { value: summary?.totalFarmers ?? 0, label: "Total Farmers Mapped", raw: true },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold" style={{ color: "var(--ink)" }}>Erode District Maps</h1>
          <p className="text-[13px] mt-1 flex items-center gap-1.5" style={{ color: "var(--ink)", opacity: 0.6 }}>
            Real GPS locations of {summary?.totalFarmers ?? "—"} surveyed farmers across {summary?.villageCount ?? "—"} villages and {summary?.blockCount ?? "—"} blocks.
          </p>
        </div>
      </div>

      {/* KPI row — 3 equally spaced */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass-card-master p-4">
            <div className="kpi-number" style={{ fontSize: 26 }}>
              {k.raw ? nf.format(k.value) : k.value}
            </div>
            <p className="text-[12px] mt-1" style={{ color: "var(--ink)", opacity: 0.55 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Map left, Coverage right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* isolate: Leaflet's own panes/controls use internal z-indices up to
            1000 (popup pane 700, controls 1000+). Without a local stacking
            context those values compare directly against the app's own
            z-index scale (Sidebar z-40, Command Palette dialog z-50) and
            win, so the map renders on top of the search overlay. Isolating
            here confines all of Leaflet's internal stacking to this card. */}
        <div className="glass-card-master relative isolate overflow-hidden lg:col-span-2 h-[560px]">
          <div
            className="absolute top-3 right-3 z-[500] flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
            style={{ background: "var(--surface-emphasis)", color: "var(--foreground-emphasis)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--sage)" }} />
            LIVE · Field View
          </div>
          <DistrictMap />
        </div>

        {/* self-start => card hugs its content instead of stretching to map height */}
        <div className="glass-card-master p-4 self-start">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>Coverage</h3>
            <span className="text-[11px]" style={{ color: "var(--ink)", opacity: 0.45 }}>
              {blockAcres.length} blocks
            </span>
          </div>

          <div>
            {blockAcres.map((b) => (
              <div
                key={b.block}
                className="flex items-center justify-between text-[12px] py-2.5"
                style={{ borderBottom: "1px solid var(--hairline)" }}
              >
                <span className="truncate pr-2" style={{ color: "var(--ink)", opacity: 0.78 }}>{b.block}</span>
                <span className="table-cell-numeric font-medium shrink-0" style={{ color: "var(--ink)" }}>
                  {nf.format(Math.round(b.acres))} ac
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[12px] pt-2.5">
            <span style={{ color: "var(--ink)", opacity: 0.55 }}>Total</span>
            <span className="table-cell-numeric font-semibold" style={{ color: "var(--ink)" }}>
              {nf.format(Math.round(totalAcres))} ac
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}