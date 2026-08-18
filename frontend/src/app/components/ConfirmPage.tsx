// src/app/components/ConfirmPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function ConfirmPage() {
  const [status, setStatus] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    const token = params.get("token");
    if (!token) { setStatus("error"); return; }
    supabase.rpc("confirm_email", { p_token: token }).then(({ error }) =>
      setStatus(error ? "error" : "done")
    );
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4"
         style={{ background: "radial-gradient(circle at 30% 20%, #26301B 0%, #1A2013 55%, #141810 100%)" }}>
      <div className="max-w-sm">
        {status === "working" && <p className="text-white/70">Confirming…</p>}
        {status === "error" && <p className="text-white/70">Invalid or expired link.</p>}
        {status === "done" && (
          <>
            <h1 className="text-white text-xl font-bold mb-3">Registration complete</h1>
            <p className="text-white/60 text-sm">You can now sign in with your email and password.</p>
          </>
        )}
      </div>
    </div>
  );
}