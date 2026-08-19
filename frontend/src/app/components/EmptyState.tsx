export function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="glass-card-master p-12 text-center">
      <h3 className="text-[16px] font-semibold" style={{ color: "var(--ink)" }}>
        No uploads yet
      </h3>
      <p className="text-[13px] mt-1.5 mb-5 max-w-sm mx-auto" style={{ color: "var(--ink)", opacity: 0.55 }}>
        Upload a verified Kobo export to see approval rates, block coverage, and
        upload history.
      </p>
      <button
        onClick={onUpload}
        className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white"
      >
        Upload export
      </button>
    </div>
  );
}