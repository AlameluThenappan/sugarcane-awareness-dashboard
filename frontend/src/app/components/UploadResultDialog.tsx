import { nf } from "../../app/pages/PageKit";

export type UploadResult = {
  filename: string;
  rowCount: number;
  approved: number;
  notApproved: number;
  newRecords: number;
};

export function UploadResultDialog({
  result, onClose,
}: { result: UploadResult | null; onClose: () => void }) {
  if (!result) return null;

  const stats: { label: string; value: number }[] = [
    { label: "Rows in file", value: result.rowCount },
    { label: "Approved", value: result.approved },
    { label: "Not approved", value: result.notApproved },
    { label: "New records added", value: result.newRecords },
  ];

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: "rgba(10,28,16,0.45)" }}
      onClick={onClose}
    >
      <div className="glass-card-master p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[16px] font-semibold" style={{ color: "var(--ink)" }}>
          Upload complete
        </h3>
        <p className="text-[12px] mt-1.5 truncate" style={{ color: "var(--ink)", opacity: 0.55 }}>
          {result.filename}
        </p>

        <div className="grid grid-cols-2 gap-2.5 mt-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl px-3.5 py-3 text-left" style={{ border: "1px solid var(--hairline)" }}>
              <p className="text-[19px] font-semibold" style={{ color: "var(--ink)" }}>{nf.format(s.value)}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--ink)", opacity: 0.55 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-primary py-2 mt-5 text-[13px] font-medium text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}