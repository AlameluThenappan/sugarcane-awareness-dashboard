import { useRef, useState } from "react";

const OK_EXT = [".xlsx", ".xls"];

export function UploadDropzone({
  open, onClose, onFile, busy,
}: {
  open: boolean;
  onClose: () => void;
  onFile: (file: File) => void;
  busy: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  const accept = (file?: File) => {
    if (!file) return;
    const ok = OK_EXT.some((e) => file.name.toLowerCase().endsWith(e));
    if (!ok) {
      setErr("Only .xlsx and .xls files are accepted.");
      return;
    }
    setErr("");
    onFile(file);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: "rgba(10,28,16,0.45)" }}
      onClick={busy ? undefined : onClose}
    >
      <div
        className="glass-card-master p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[16px] font-semibold" style={{ color: "var(--ink)" }}>
          Upload verified export
        </h3>
        <p className="text-[12px] mt-1 mb-4" style={{ color: "var(--ink)", opacity: 0.55 }}>
          Excel file exported from KoboToolbox after verification.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) accept(e.dataTransfer.files?.[0]);
          }}
          onClick={() => !busy && fileRef.current?.click()}
          className="rounded-xl p-8 text-center cursor-pointer transition-colors"
          style={{
            border: `1px dashed ${dragging ? "var(--sage)" : "var(--hairline)"}`,
            background: dragging ? "rgba(67,112,83,0.06)" : "transparent",
            opacity: busy ? 0.5 : 1,
          }}
        >
          <p className="text-[13px]" style={{ color: "var(--ink)", opacity: 0.75 }}>
            {busy ? "Processing…" : "Drop the file here, or click to browse"}
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--ink)", opacity: 0.45 }}>
            .xlsx or .xls
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; accept(f); }}
          className="hidden"
        />

        {err && (
          <p className="text-[12px] mt-3" style={{ color: "var(--clay)" }}>{err}</p>
        )}

        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border px-3 py-1.5 text-[12px] disabled:opacity-40"
            style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}