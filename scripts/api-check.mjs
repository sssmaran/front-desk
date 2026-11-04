// The reviewers' test, automated: log in as the viewer, pull every visit
// (list pages, details, stats) and search the raw text for any visitor or
// host name/email from visits.csv. Also checks 401 / 400 / 403.
// Usage: npm run dev, npm run demo:setup, then: npm run check:api
import fs from "node:fs";
import Papa from "papaparse";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}`); if (!ok) failures++; };

const rows = Papa.parse(fs.readFileSync("visits.csv", "utf8"), { header: true, skipEmptyLines: true }).data;
const secrets = new Set();
for (const r of rows) for (const k of ["visitor_name", "visitor_email", "host_name", "host_email", "visitor_company"]) {
  secrets.add(r[k].trim().toLowerCase());
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} (did you run npm run demo:setup?)`);
  return (await res.json()).token;
}
const get = (path, token) => fetch(`${BASE}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

const admin = await login("dana.whitfield@brightline.example", "FrontDesk-Admin-2026");
const viewer = await login("sam.ferreira@brightline.example", "FrontDesk-Viewer-2026");

// 1. Viewer leak scan over every page, every detail, and stats.
let raw = "";
const bad = [];
async function grab(path) {
  const res = await get(path, viewer);
  if (res.status !== 200) bad.push(`${path} -> ${res.status}`);
  return res.text();
}
const firstText = await grab("/api/visits?pageSize=100");
const first = JSON.parse(firstText);
raw += firstText;
for (let p = 2; p <= first.totalPages; p++) raw += await grab(`/api/visits?pageSize=100&page=${p}`);
const ids = [...new Set([...raw.matchAll(/"visit_id":"(V\d{6})"/g)].map((m) => m[1]))];
for (const id of ids) raw += await grab(`/api/visits/${id}`); // every detail, not a sample
raw += await grab("/api/stats");
check(bad.length === 0, `every viewer request returned 200 (${ids.length} details scanned)${bad.length ? ` — ${bad.slice(0, 3).join("; ")}` : ""}`);
const lower = raw.toLowerCase();
const leaked = [...secrets].filter((s) => lower.includes(s));
check(first.total === 1953, `viewer sees 1953 cleaned visits (got ${first.total})`);
check(leaked.length === 0, `viewer responses contain no visitor/host name, email or company${leaked.length ? ` — leaked: ${leaked.slice(0, 5).join(", ")}` : ""}`);

// 2. Admin does see identities (so the scan above is meaningful).
const adminVisit = await (await get("/api/visits/V000004", admin)).json();
check(adminVisit.visit?.visitor_name === "Felix Fischer", "admin sees visitor name on V000004");

// 3. Status codes.
for (const path of ["/api/me", "/api/visits", "/api/visits/V000004", "/api/stats", "/api/admin/users"]) {
  const res = await get(path);
  check(res.status === 401 && (res.headers.get("content-type") ?? "").includes("json"), `unauthenticated ${path} -> JSON 401`);
}
check((await get("/api/visits?from=2026-08-31&to=2026-08-01", viewer)).status === 400, "end before start -> 400");
check((await get("/api/visits?type=party", viewer)).status === 400, "nonsense visit type -> 400");
check((await get("/api/admin/users", viewer)).status === 403, "viewer -> /api/admin/users 403");
check((await get("/api/visits?page=1000", viewer)).status === 400, "page past the end -> 400");
const junk = await fetch(`${BASE}/api/me`, { headers: { cookie: "fd_session=%ZZ" } });
check(junk.status === 401, `malformed session cookie -> 401 (got ${junk.status})`);
check((await get("/api/admin/users", admin)).status === 200, "admin -> /api/admin/users 200");

// Data quality is based on date coverage, independently of the visit-type filter.
for (const query of ["", "?from=2026-08-10&to=2026-08-13", "?from=2026-08-11&to=2026-08-12&type=interview", "?from=2026-08-09&to=2026-08-11"]) {
  const res = await get(`/api/visits${query}`, viewer);
  const data = await res.json();
  check(res.status === 200 && data.dataGaps?.length === 1 && data.dataGaps[0].from === "2026-08-10" && data.dataGaps[0].to === "2026-08-13",
    `overlapping range reports the possible gap (${query || "default"})`);
}
for (const query of ["?to=2026-08-09", "?from=2026-08-14", "?from=2026-09-01&to=2026-09-30"]) {
  const res = await get(`/api/visits${query}`, viewer);
  const data = await res.json();
  check(res.status === 200 && Array.isArray(data.dataGaps) && data.dataGaps.length === 0,
    `range outside the gap has no gap notice (${query})`);
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
