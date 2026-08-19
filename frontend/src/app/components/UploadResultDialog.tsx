import { nf } from "../../app/pages/PageKit";

export type UploadResult = {
  filename: string;
  newRecords: number;
};

export function UploadResultDialog({
  result, onClose,
}: { result: UploadResult | null; onClose: () => void }) {
  if (!result) return null;

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
        <p className="text-[13px] mt-4" style={{ color: "var(--ink)", opacity: 0.8 }}>
          {nf.format(result.newRecords)} new records added
        </p>
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