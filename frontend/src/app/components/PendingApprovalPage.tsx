export function PendingApprovalPage({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ background: "radial-gradient(circle at 30% 20%, #26301B 0%, #1A2013 55%, #141810 100%)" }}
    >
      <div className="text-center max-w-sm">
        <h1 className="text-white text-xl font-bold mb-3">Awaiting approval</h1>
        <p className="text-white/60 text-sm">
          Your request for verifier access has been sent to the administrator.
          You'll be able to sign in at <span className="text-white/80">{email}</span> once it's approved.
        </p>
        <button onClick={onSignOut} className="mt-6 rounded-full border border-white/20 px-5 py-2 text-sm text-white/80">
          Sign out
        </button>
      </div>
    </div>
  );
}