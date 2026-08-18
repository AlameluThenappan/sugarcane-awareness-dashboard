import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "verifier";
  status: "pending" | "approved";
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, expectedRole: "admin" | "verifier") => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: string, email: string): Promise<AuthUser> {
  const { data } = await supabase
    .from("profiles")
    .select("role, status, username")
    .eq("id", userId)
    .single();

  return {
    id: userId,
    name: data?.username || email.split("@")[0],
    email,
    role: (data?.role as "admin" | "verifier") ?? "admin",
    status: (data?.status as "pending" | "approved") ?? "approved",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        setToken(data.session.access_token);
        setUser(await loadProfile(data.session.user.id, data.session.user.email!));
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (s?.user) {
        setToken(s.access_token);
        setUser(await loadProfile(s.user.id, s.user.email!));
      } else {
        setToken(null);
        setUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string, expectedRole: "admin" | "verifier") {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.session) throw new Error("Invalid email or password.");

    const profile = await loadProfile(data.session.user.id, data.session.user.email!);

    if (profile.role !== expectedRole) {
      await supabase.auth.signOut();
      throw new Error("Invalid email or password.");
    }
    if (profile.role === "verifier" && profile.status !== "approved") {
      // Leave the session active — App.tsx routes pending verifiers to
      // PendingApprovalPage rather than blocking sign-in outright.
      setToken(data.session.access_token);
      setUser(profile);
      return;
    }

    setToken(data.session.access_token);
    setUser(profile);
  }

  async function logout() {
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}