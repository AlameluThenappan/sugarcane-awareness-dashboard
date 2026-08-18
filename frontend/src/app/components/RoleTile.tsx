type Role = "admin" | "verifier";

export function RoleTile({
  role, label, hint, active, onClick,
}: { role: Role; label: string; hint: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-xl px-3 py-3.5 text-left transition-all"
      style={{
        border: `1.5px solid ${active ? "#DBC593" : "rgba(255,255,255,0.15)"}`,
        background: active ? "rgba(219,197,147,0.10)" : "transparent",
      }}
    >
      <span className="block text-[13px] font-semibold" style={{ color: active ? "#DBC593" : "#fff" }}>
        {label}
      </span>
      <span className="block text-[10.5px] mt-0.5 text-white/45">{hint}</span>
    </button>
  );
}