export function VerifierApp({ userName, onLogout }: { userName: string; onLogout: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p>Signed in as {userName} (verifier)</p>
        <button onClick={onLogout}>Sign out</button>
      </div>
    </div>
  );
}