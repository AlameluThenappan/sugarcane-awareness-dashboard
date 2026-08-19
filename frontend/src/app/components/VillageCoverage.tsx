import { useState } from "react";
import { VillageRow } from "../lib/verifierTypes";
import { nf } from "../../app/pages/PageKit";

export function VillageCoverage({ data }: { data: VillageRow[] | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return <div className="glass-card-master p-5 h-[320px]" />;

  const rows = [...data].sort((a, b) => a.records - b.records);
  const shown = expanded ? rows : rows.slice(0, 6);

  return (
    <div className="glass-card-master p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
          Village Coverage
        </h3>
        <span className="text-[11px]" style={{ color: "var(--ink)", opacity: 0.45 }}>
          {rows.length} villages
        </span>
      </div>
      <p className="text-[12px] mb-3" style={{ color: "var(--ink)", opacity: 0.55 }}>
        Lowest record count first
      </p>

      <div>
        {shown.map((v) => (
          <div
            key={v.village}
            className="flex items-center justify-between text-[12px] py-2.5"
            style={{ borderBottom: "1px solid var(--hairline)" }}
          >
            <span className="truncate pr-2" style={{ color: "var(--ink)", opacity: 0.78 }}>
              {v.village}
            </span>
            <span className="table-cell-numeric shrink-0" style={{ color: "var(--ink)", opacity: 0.6 }}>
              {nf.format(v.records)} records · {v.approvalRate}%
            </span>
          </div>
        ))}
      </div>

      {rows.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] mt-3"
          style={{ color: "var(--sage)" }}
        >
          {expanded ? "Show less" : `Show all ${rows.length} villages`}
        </button>
      )}
    </div>
  );
}