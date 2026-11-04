"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, safeNext } from "@/lib/client/api";
import { ErrorBox } from "@/components/states";

function SignupForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
    setBusy(false);
    if (res.error) return setError(res.error);
    router.push(`/login?created=1&email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="page narrow">
      <form className="panel authcard" onSubmit={submit} noValidate>
        <span className="brand-rule" aria-hidden />
        <h1 className="h-page">Create an account</h1>
        <p className="quiet">Use your Brightline work email. Access is limited to the workplace team.</p>
        {error && <ErrorBox message={error} />}
        <label className="field">
          <span>Work email</span>
          <input type="email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" name="password" autoComplete="new-password" aria-describedby="password-hint" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <small className="quiet" id="password-hint">At least 8 characters.</small>
        </label>
        <button className="btn" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <p className="quiet small">
          Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}
