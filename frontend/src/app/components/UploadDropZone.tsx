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
          className="group relative overflow-hidden rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ease-out"
          style={{
            border: dragging ? "2px solid var(--sage)" : "2px dashed var(--hairline)",
            background: dragging ? "rgba(67,112,83,0.06)" : "transparent",
            transform: dragging ? "scale(1.02)" : "scale(1)",
            opacity: busy ? 0.5 : 1,
          }}
        >
          {/* Hover state background */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
            style={{ background: "rgba(67,112,83,0.02)" }} 
          />
          
          <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all duration-300 shadow-sm"
              style={{ 
                backgroundColor: dragging ? "var(--sage)" : "var(--background)", 
                color: dragging ? "#fff" : "var(--ink)", 
                border: dragging ? "none" : "1px solid var(--hairline)",
                transform: dragging ? "translateY(-4px)" : "translateY(0)"
              }}
            >
              <svg className="w-6 h-6 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <p className="text-[15px] font-medium mb-1 transition-colors duration-300" style={{ color: dragging ? "var(--sage)" : "var(--ink)" }}>
              {busy ? "Processing file…" : (
                <>
                  <span style={{ color: "var(--sage)", fontWeight: 600 }}>Click to upload</span> or drag and drop
                </>
              )}
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--ink)", opacity: 0.5 }}>
              Excel spreadsheets (.xlsx, .xls)
            </p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; accept(f); }}
          className="hidden"
        />

        {err && (
          <div className="mt-4 p-3 rounded-xl flex items-start gap-2 text-[13px] font-medium" style={{ background: "var(--clay)", color: "#fff" }}>
            <svg className="w-4 h-4 mt-[2px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {err}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-6 py-2 text-[13px] font-semibold transition-colors disabled:opacity-40 hover:bg-muted"
            style={{ border: "1px solid var(--hairline)", color: "var(--ink)", background: "transparent" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}