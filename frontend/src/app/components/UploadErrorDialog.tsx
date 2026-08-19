export type UploadError = { filename: string; errors: string[] };

export function UploadErrorDialog({
  error, onClose,
}: { error: UploadError | null; onClose: () => void }) {
  if (!error) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: "rgba(10,28,16,0.45)" }}
      onClick={onClose}
    >
      <div className="glass-card-master p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[16px] font-semibold" style={{ color: "var(--clay)" }}>
          Upload rejected
        </h3>
        <p className="text-[12px] mt-1 mb-4" style={{ color: "var(--ink)", opacity: 0.6 }}>
          No records were imported. Fix the file and upload again.
        </p>

        <div className="max-h-[240px] overflow-y-auto">
          {error.errors.map((e, i) => (
            <p
              key={i}
              className="text-[12px] py-2"
              style={{ borderBottom: "1px solid var(--hairline)", color: "var(--ink)", opacity: 0.8 }}
            >
              {e}
            </p>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-lg border py-2 mt-5 text-[13px]"
          style={{ borderColor: "var(--hairline)", color: "var(--ink)" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}