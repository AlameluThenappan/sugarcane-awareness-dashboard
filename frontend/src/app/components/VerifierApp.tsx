// src/app/components/VerifierApp.tsx
export function VerifierApp({ userName, onLogout }: { userName: string; onLogout: () => void }) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ background: "radial-gradient(circle at 30% 20%, #26301B 0%, #1A2013 55%, #141810 100%)" }}
    >
      <div className="text-center max-w-sm">
        <h1 className="text-white text-2xl font-bold mb-2">Verifier Dashboard</h1>
        <p className="text-white/60 text-sm mb-6">Signed in as {userName}. Verification tools coming soon.</p>
        <button
          onClick={onLogout}
          className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/80"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}