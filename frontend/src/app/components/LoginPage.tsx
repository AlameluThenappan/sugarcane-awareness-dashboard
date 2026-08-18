import { useState } from "react";
import { Leaf, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { RoleTile } from "./RoleTile";

type Role = "admin" | "verifier";

export function LoginPage({
  onBack, onRegister,
}: { onBack?: () => void; onRegister: () => void }) {
  const { login } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password, role ?? "admin");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: "radial-gradient(circle at 30% 20%, #26301B 0%, #1A2013 55%, #141810 100%)" }}
    >
      <div className="relative z-10 w-full max-w-md">
        {onBack && (
          <button type="button" onClick={onBack} className="text-white/50 hover:text-white/80 text-xs font-medium mb-6">
            ← Back
          </button>
        )}

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ background: "#DBC593" }}>
            <Leaf size={24} style={{ color: "#1A2013" }} strokeWidth={2.25} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: "#DBC593" }}>
            Environmental Defense Fund
          </span>
          <h1 className="text-white text-3xl md:text-4xl font-bold tracking-tight text-center leading-tight">
            Sugarcane Analytics<br />Platform
          </h1>
          <p className="text-white/60 text-sm mt-3 text-center max-w-xs">Sign in to access the survey dashboard.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl p-7 space-y-5"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(16px)" }}
        >
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-2 block">
              Select user type
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <RoleTile role="admin" label="Admin" hint="Analytics dashboard" active={role === "admin"} onClick={() => setRole("admin")} />
              <RoleTile role="verifier" label="Verifier" hint="Upload verified data" active={role === "verifier"} onClick={() => setRole("verifier")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required autoFocus
              className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-200 bg-rose-500/15 border border-rose-400/30 rounded-xl px-3.5 py-2.5">{error}</p>
          )}

          <button
            type="submit" disabled={submitting || !role}
            className="w-full flex items-center justify-center gap-2 font-semibold text-sm rounded-full py-3 mt-2 disabled:opacity-60"
            style={{ background: "#DBC593", color: "#1A2013" }}
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : <>Sign In <ArrowRight size={15} /></>}
          </button>

          {role === "verifier" && (
            <p className="text-center text-[12px] text-white/50">
              New verifier?{" "}
              <button type="button" onClick={onRegister} className="font-semibold" style={{ color: "#DBC593" }}>
                Register
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}