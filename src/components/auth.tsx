"use client";
// Who is signed in, for the UI only. The API re-checks every request, so this
// is a convenience (redirects, hiding links), not a security control.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { forgetVisits } from "@/lib/client/lastVisits";

export interface Me {
  email: string;
  name: string;
  role: "admin" | "viewer";
  canSeeIdentities: boolean;
  canManageUsers: boolean;
}

interface AuthState {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<Me | null>;
  signOut: () => Promise<void>;
  signOutError: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await api<Me>("/api/me");
    setMe(res.data);
    setLoading(false);
    return res.data;
  }, []);

  const [signOutError, setSignOutError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    setSignOutError(null);
    const res = await api("/api/auth/logout", { method: "POST" });
    // 204 = signed out; 401 = session was already gone. Anything else: stay put and say so.
    if (res.error && res.status !== 401) {
      setSignOutError("Couldn't sign out. Check the server is running and try again.");
      return;
    }
    // Full page load, and deliberately no setMe(null) first: clearing `me` while the old
    // page is mounted makes its RequireAuth guard redirect to /login?next=<old page>,
    // so the next person would land where the previous one was.
    forgetVisits(); // the next person in this tab starts from the default list
    window.location.replace("/login");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ me, loading, refresh, signOut, signOutError }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

function loginUrl() {
  const here = window.location.pathname + window.location.search;
  return `/login?next=${encodeURIComponent(here)}`;
}

/** Sends signed-out people to /login, remembering where they were going. */
export function RequireAuth({ children }: { children: (me: Me) => React.ReactNode }) {
  const { me, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !me) router.replace(loginUrl());
  }, [loading, me, router]);
  if (loading || !me) return <p className="quiet pad">Checking your sign-in…</p>;
  return <>{children(me)}</>;
}

/** Call when an API request comes back 401 (e.g. session expired). */
export function useOnUnauthorized() {
  const router = useRouter();
  const { refresh } = useAuth();
  return useCallback(async () => {
    await refresh();
    router.replace(loginUrl());
  }, [refresh, router]);
}
