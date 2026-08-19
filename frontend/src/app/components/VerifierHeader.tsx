// src/verifier/components/VerifierHeader.tsx
import { useEffect, useRef, useState } from "react";
import { Upload, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function VerifierHeader({ onUpload }: { onUpload: () => void }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const name = user?.name ?? user?.email?.split("@")[0] ?? "";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "var(--nav-surface, var(--surface))",
        borderBottom: "1px solid var(--hairline)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="w-full px-5 md:px-8 h-[72px] flex items-center justify-between">
        <h1 className="text-[17px] font-semibold" style={{ color: "var(--ink)" }}>
          Verification Overview
        </h1>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onUpload}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, var(--sage) 0%, var(--olive) 100%)",
              color: "#F5F7F2",
            }}
          >
            <Upload size={14} strokeWidth={2.2} />
            Upload export
          </button>

          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen(!open)}
              aria-label="Account menu"
              className="w-9 h-9 rounded-full grid place-items-center text-[12px] font-semibold transition-transform hover:scale-105"
              style={{
                background: "linear-gradient(135deg, var(--sage) 0%, var(--olive) 100%)",
                color: "#F5F7F2",
                border: "2px solid var(--surface)",
                boxShadow: "0 1px 4px rgba(20,40,24,0.18)",
              }}
            >
              {initials}
            </button>

            {open && (
              <div
                className="absolute right-0 mt-2 w-60 rounded-xl overflow-hidden"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--hairline)",
                  boxShadow: "0 12px 32px rgba(20,40,24,0.16), 0 2px 6px rgba(20,40,24,0.08)",
                }}
              >
                <div className="px-4 py-3.5" style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <p className="text-[15px] font-semibold capitalize" style={{ color: "var(--ink)" }}>
                    {name}
                  </p>
                  <p className="text-[13px] mt-0.5 truncate" style={{ color: "var(--ink)", opacity: 0.55 }}>
                    {user?.email}
                  </p>
                  <span
                    className="inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(67,112,83,0.12)", color: "var(--sage)" }}
                  >
                    Verifier
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-[14px] text-left transition-colors hover:opacity-80"
                  style={{ color: "var(--clay)" }}
                >
                  <LogOut size={16} strokeWidth={2.2} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}