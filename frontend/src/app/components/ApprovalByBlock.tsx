// src/verifier/components/ApprovalByBlock.tsx
import { BlockRow } from "../lib/verifierTypes";

export function ApprovalByBlock({ data }: { data: BlockRow[] | null }) {
  if (!data) {
    return <div className="glass-card-master p-5 h-[320px]" />;
  }

  const rows = [...data]
    .map((b) => {
      const total = b.approved + b.notApproved;
      return { ...b, total, rejRate: total ? (b.notApproved / total) * 100 : 0 };
    })
    .sort((a, b) => b.rejRate - a.rejRate);

  return (
    <div className="glass-card-master p-5">
      <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
        Approval by Block
      </h3>
      <p className="text-[12px] mb-4" style={{ color: "var(--ink)", opacity: 0.55 }}>
        Sorted by rejection rate
      </p>

      <div className="space-y-3">
        {rows.map((b) => (
          <div key={b.block}>
            <div className="flex items-center justify-between text-[12px] mb-1.5">
              <span style={{ color: "var(--ink)", opacity: 0.8 }}>{b.block}</span>
              <span className="table-cell-numeric" style={{ color: "var(--ink)", opacity: 0.6 }}>
                {b.total} · {b.rejRate.toFixed(0)}%
              </span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden" style={{ background: "var(--hairline)" }}>
              <div
                style={{
                  width: `${b.total ? (b.approved / b.total) * 100 : 0}%`,
                  background: "var(--sage)",
                }}
              />
              <div
                style={{
                  width: `${b.total ? (b.notApproved / b.total) * 100 : 0}%`,
                  background: "var(--clay)",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        className="flex gap-4 mt-4 pt-3 text-[11px]"
        style={{ borderTop: "1px solid var(--hairline)", color: "var(--ink)", opacity: 0.6 }}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--sage)" }} />
          Approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--clay)" }} />
          Not approved
        </span>
      </div>
    </div>
  );
}