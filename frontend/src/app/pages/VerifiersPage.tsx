import { useEffect, useState } from "react";
import { Check, X, Trash2, UserPlus } from "lucide-react";
import {
  getPendingVerifiers, getActiveVerifiers,
  approveVerifier, rejectVerifier, removeVerifier,
  PendingVerifier, ActiveVerifier,
} from "../lib/verifierAdminApi";

export function VerifiersPage() {
  const [pending, setPending] = useState<PendingVerifier[] | null>(null);
  const [active, setActive] = useState<ActiveVerifier[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    Promise.all([getPendingVerifiers(), getActiveVerifiers()])
      .then(([p, a]) => { setPending(p); setActive(a); })
      .catch(() => {});
  };

  useEffect(load, []);

  const act = async (id: string, fn: (id: string) => Promise<void>) => {
    setBusyId(id);
    try { await fn(id); } finally { setBusyId(null); load(); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-semibold" style={{ color: "var(--ink)" }}>Verifiers</h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--ink)", opacity: 0.6 }}>
          Add new verifiers, approve requests, manage active accounts.
        </p>
      </div>

      {/* Pending requests */}
      {pending && pending.length > 0 && (
        <div className="glass-card-master p-5">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>Pending Requests</h3>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(186,98,84,0.14)", color: "var(--clay)" }}>
              {pending.length}
            </span>
          </div>
          <p className="text-[12px] mb-3" style={{ color: "var(--ink)", opacity: 0.55 }}>
            Cannot sign in until approved
          </p>
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl px-3.5 py-3"
                   style={{ border: "1px solid var(--hairline)", background: "rgba(186,98,84,0.04)" }}>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--ink)" }}>{r.username}</p>
                  <p className="text-[11.5px] truncate" style={{ color: "var(--ink)", opacity: 0.55 }}>{r.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button disabled={busyId === r.id} onClick={() => act(r.id, (id) => approveVerifier(id, r.email))}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
                    style={{ background: "var(--sage)", color: "#F5F7F2" }}>
                    <Check size={13} /> Approve
                  </button>
                  <button disabled={busyId === r.id} onClick={() => act(r.id, rejectVerifier)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
                    style={{ border: "1px solid var(--hairline)", color: "var(--clay)" }}>
                    <X size={13} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active verifiers */}
      <div className="glass-card-master p-5">
        <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--ink)" }}>Active Verifiers</h3>
        <p className="text-[12px] mb-3" style={{ color: "var(--ink)", opacity: 0.55 }}>
          {active?.length ?? 0} active · removing revokes access immediately
        </p>
        {active?.length === 0 && (
          <p className="text-[12px] italic py-6 text-center" style={{ color: "var(--ink)", opacity: 0.4 }}>
            No active verifiers.
          </p>
        )}
        {active?.map((v) => (
          <div key={v.id} className="flex items-center justify-between py-3"
               style={{ borderBottom: "1px solid var(--hairline)" }}>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: "var(--ink)" }}>{v.username}</p>
              <p className="text-[11.5px] truncate" style={{ color: "var(--ink)", opacity: 0.55 }}>{v.email}</p>
            </div>
            <button
              disabled={busyId === v.id}
              onClick={() => { if (confirm(`Remove ${v.username}?`)) act(v.id, removeVerifier); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium disabled:opacity-40"
              style={{ border: "1px solid rgba(186,98,84,0.3)", color: "var(--clay)" }}
            >
              <Trash2 size={13} /> Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}