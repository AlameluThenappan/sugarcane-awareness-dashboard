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

// Returns null on any failure — callers must treat null as "not safe to
// grant access," never fall back to a default role.
async function loadProfile(userId: string, email: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, status, username")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("Failed to load profile:", error);
    return null;
  }

  return {
    id: userId,
    name: data.username || email.split("@")[0],
    email,
    role: data.role as "admin" | "verifier",
    status: data.status as "pending" | "approved",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const profile = await loadProfile(data.session.user.id, data.session.user.email!);
        if (profile) {
          setToken(data.session.access_token);
          setUser(profile);
        } else {
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (s?.user) {
        const profile = await loadProfile(s.user.id, s.user.email!);
        if (profile) {
          setToken(s.access_token);
          setUser(profile);
        } else {
          setToken(null);
          setUser(null);
        }
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
    if (!profile) {
      await supabase.auth.signOut();
      throw new Error("Could not load account. Please try again.");
    }

    if (profile.role !== expectedRole) {
      await supabase.auth.signOut();
      throw new Error("Invalid email or password.");
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