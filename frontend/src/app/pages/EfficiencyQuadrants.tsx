import { AnalyticsRow, QuadrantKey, QuadrantOverview } from "../lib/api";

const QUADRANTS = [
  { key: "eff", label: "EFFICIENT TARGET", desc: "High Yield, Low Nitrogen", card: "#ECFDF5", badgeBg: "#D0FAE5", badgeText: "#047857", num: "#059669" },
  { key: "exc", label: "EXCESSIVE N", desc: "High Yield, High Nitrogen", card: "#FFFBEB", badgeBg: "#FEF3C6", badgeText: "#92400E", num: "#B45309" },
  { key: "und", label: "UNDER-FERTILIZED", desc: "Low Yield, Low Nitrogen", card: "#F8FAFC", badgeBg: "#1F2937", badgeText: "#F8FAFC", num: "#1E293B" },
  { key: "cri", label: "CRITICAL OUTLIERS", desc: "Low Yield, High Nitrogen", card: "#FEF2F2", badgeBg: "#FFE2E2", badgeText: "#B91C1C", num: "#DC2626" },
] as const;

export function EfficiencyQuadrants({ overview, fallbackRows, fallbackYieldSplit, onSelect }: {
  overview: QuadrantOverview | null;
  fallbackRows: AnalyticsRow[];
  fallbackYieldSplit: number;
  onSelect: (key: QuadrantKey) => void;
}) {
  // The Overview card is defined by the same complete analytics population
  // it used before the quadrant drill-down was added.
  const nSplit = 130;
  const fallbackCounts = fallbackRows.reduce<Record<QuadrantKey, number>>((counts, row) => {
    if (row.yield <= 0 || row.n <= 0 || !fallbackYieldSplit) return counts;
    const key: QuadrantKey = row.yield >= fallbackYieldSplit
      ? row.n >= nSplit ? "exc" : "eff"
      : row.n >= nSplit ? "cri" : "und";
    counts[key] += 1;
    return counts;
  }, { eff: 0, exc: 0, und: 0, cri: 0 });
  const counts = fallbackCounts;

  return (
    <div className="glass-card-master p-4 h-[280px] flex flex-col">
      <h3 className="text-[13px] font-semibold leading-tight" style={{ color: "var(--ink)" }}>Yield vs Nitrogen Efficiency</h3>
      <p className="text-[10.5px] mt-0.5 mb-2.5" style={{ color: "var(--ink)", opacity: 0.5 }}>
        Split at avg yield {(overview?.yieldSplit ?? fallbackYieldSplit).toFixed(1)} t/ha · N threshold {nSplit} kg
      </p>
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        {QUADRANTS.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => onSelect(q.key)}
            className="rounded-xl px-2.5 py-2 flex flex-col justify-between min-h-0 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer"
            style={{ background: q.card, border: "1px solid rgba(12,32,18,0.05)", outlineColor: q.num }}
            aria-label={`Open ${q.label} insights`}
          >
            <div className="min-h-0">
              <span className="inline-block px-1.5 py-[2px] rounded-md text-[7.5px] font-bold tracking-wide" style={{ background: q.badgeBg, color: q.badgeText }}>{q.label}</span>
              <p className="text-[9.5px] mt-1 leading-tight" style={{ color: "#64748B" }}>{q.desc}</p>
            </div>
            <div className="text-[19px] font-bold leading-none" style={{ color: q.num }}>{counts[q.key]}<span className="text-[10.5px] font-semibold ml-1">Farms</span></div>
          </button>
        ))}
      </div>
    </div>
  );
}
