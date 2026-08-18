import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export function RegisterPage({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirm !== "" && password !== confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mismatch) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!username.trim()) { setError("Username is required."); return; }

    setSubmitting(true);
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: "D:/Awareness_Dashboard/frontend/src/app/components/RegisteredPage.tsx",
        },
      });
      if (signUpErr) throw signUpErr;
      if (!signUpData.user) throw new Error("Registration failed.");

      const { error: regErr } = await supabase.rpc("register_verifier", {
        p_username: username.trim(),
      });
      if (regErr) throw regErr;

      onDone();
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ background: "radial-gradient(circle at 30% 20%, #26301B 0%, #1A2013 55%, #141810 100%)" }}
    >
      <div className="relative z-10 w-full max-w-md">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs font-medium mb-6">
          <ArrowLeft size={13} /> Back to sign in
        </button>

        <h1 className="text-white text-2xl font-bold mb-1">Register as Verifier</h1>
        <p className="text-white/60 text-sm mb-6">Your account needs admin approval before you can sign in.</p>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl p-7 space-y-4"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(16px)" }}
        >
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required
            className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required
            className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create password" required
            className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none" />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" required
            className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none" />

          {error && <p className="text-xs text-rose-200 bg-rose-500/15 border border-rose-400/30 rounded-xl px-3.5 py-2.5">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 font-semibold text-sm rounded-full py-3 mt-2 disabled:opacity-60"
            style={{ background: "#DBC593", color: "#1A2013" }}>
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Registering...</> : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}