// src/app/components/RegisteredPage.tsx
export function RegisteredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4"
         style={{ background: "radial-gradient(circle at 30% 20%, #26301B 0%, #1A2013 55%, #141810 100%)" }}>
      <div>
        <h1 className="text-white text-xl font-bold mb-3">Request received</h1>
        <p className="text-white/60 text-sm max-w-sm">
          Your registration is waiting for administrator approval.
          You'll be able to sign in once it's approved.
        </p>
      </div>
    </div>
  );
}