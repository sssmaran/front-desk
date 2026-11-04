// Creates the two README test accounts through the real signup API
// (so they go through the same allowlist check as everyone else).
// Usage: start the app (npm run dev), then: npm run demo:setup
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const accounts = [
  { email: "dana.whitfield@brightline.example", password: "FrontDesk-Admin-2026", role: "admin" },
  { email: "sam.ferreira@brightline.example", password: "FrontDesk-Viewer-2026", role: "viewer" },
];
for (const a of accounts) {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: a.email, password: a.password }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 201) console.log(`created ${a.role}: ${a.email}`);
  else if (res.status === 409) console.log(`already exists (${a.role}): ${a.email} — password left unchanged`);
  else { console.error(`failed for ${a.email}: ${res.status} ${body.error ?? ""}`); process.exitCode = 1; }
}
