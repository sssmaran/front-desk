"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, safeNext } from "@/lib/client/api";
import { forgetVisits } from "@/lib/client/lastVisits";
import { useAuth } from "@/components/auth";
import { ErrorBox } from "@/components/states";

function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const justCreated = params.get("created") === "1";
  const router = useRouter();
  const { me, loading, refresh } = useAuth();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && me) router.replace(next);
  }, [loading, me, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if (res.error) {
      setError(res.error);
      setBusy(false);
      return;
    }
    forgetVisits(); // a fresh sign-in never reuses a list remembered in this tab
    await refresh();
    router.replace(next);
  }

  return (
    <div className="page narrow">
      <form className="panel authcard" onSubmit={submit} noValidate>
        <span className="brand-rule" aria-hidden />
        <h1 className="h-page">Sign in</h1>
        <p className="quiet">Lobby sign-ins for the Brightline office.</p>
        {justCreated && <div className="okbox" role="status">Account created. Sign in to continue.</div>}
        {error && <ErrorBox message={error} />}
        <label className="field">
          <span>Work email</span>
          <input type="email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <p className="quiet small">
          First time here? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
