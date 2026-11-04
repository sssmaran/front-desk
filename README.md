# The Front Desk

A small local app for Brightline's workplace team: lobby sign-ins, with access
rules enforced in the API. Next.js (App Router) + TypeScript, one process.

## Run it

Requires Node 20.9.0 or newer (Next.js 16's minimum).

```sh
npm install
npm run dev            # http://localhost:3000
npm run demo:setup     # in a second terminal: creates the two test accounts below
npm run check:api      # optional: the viewer leak test + 401/400/403 checks
```

If the page keeps reloading in dev (usually after running `npm run build` in the
same folder), stop the server, run `rm -rf .next`, and start `npm run dev` again.

## Test logins

| Role   | Email                               | Password               |
|--------|-------------------------------------|------------------------|
| admin  | dana.whitfield@brightline.example   | FrontDesk-Admin-2026   |
| viewer | sam.ferreira@brightline.example     | FrontDesk-Viewer-2026  |

The other six people on `allowed_users.csv` can sign up themselves at `/signup`.
Accounts are stored in `data/users.json`; delete that file to start fresh.

## curl examples

**1. Log in** (returns a token and also sets an HttpOnly cookie):

```sh
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"sam.ferreira@brightline.example","password":"FrontDesk-Viewer-2026"}'
# {"email":"sam.ferreira@brightline.example","name":"Sam Ferreira","role":"viewer","token":"..."}

TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"sam.ferreira@brightline.example","password":"FrontDesk-Viewer-2026"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
```

**2. Filtered visits** (interviews in August, as the viewer — no names or emails in the payload):

```sh
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/visits?type=interview&from=2026-08-01&to=2026-08-31&pageSize=5"
```

Prefer cookies? `curl -c cookies.txt ... /api/auth/login` then `curl -b cookies.txt ...`.

## API

All responses are JSON. Errors are `{"error": "..."}`. Every endpoint except
signup/login checks the session itself; page guards in the UI are only a convenience.

| Method & path            | Who        | Does |
|--------------------------|------------|------|
| `POST /api/auth/signup`  | anyone     | `{email, password}` → 201. Email must be on the allowlist (matched trimmed, case-insensitive) else 403. Existing account 409. Password at least 8 characters and at most 72 bytes (bcrypt's limit; accents and emoji use more than one byte). Role/name come only from the allowlist. |
| `POST /api/auth/login`   | anyone     | `{email, password}` → 200 + cookie + `token`. Wrong details 401. |
| `POST /api/auth/logout`  | signed in  | Ends the session, 204. |
| `GET /api/me`            | signed in  | Your email, name, role, and what you may see. |
| `GET /api/visits`        | signed in  | `from`, `to` (YYYY-MM-DD, inclusive), `type` (guest/interview/contractor/vendor), `page` (default 1), `pageSize` (default 25, max 100). Newest first. Returns `{visits, total, page, pageSize, totalPages, filters, notices, dataGaps}` (`dataGaps` lists date ranges inside your filter with no records, e.g. Aug 10–13). A page past the end is 400. |
| `GET /api/visits/:id`    | signed in  | One visit. Malformed ID 400, unknown 404. |
| `GET /api/stats`         | signed in  | Same `from`/`to`/`type` filters. Totals, counts by weekday and by sign-in hour, busiest day/hour, by type and host team, data notices. Aggregates only. |
| `GET /api/admin/users`   | admin only | The allowlist and who has signed up. Viewer 403. |

Status codes: 401 no/expired session, 403 wrong role or not on the list,
400 bad input (end date before start, unknown visit type, impossible date,
unknown parameter, bad page) with a message saying how to fix it.

**What each role gets for a visit**

- viewer: `visit_id, visit_date, signed_in_at, signed_out_at, visit_type, host_team, pre_registered`
- admin: all of the above plus `visitor_name, visitor_email, visitor_company, host_name, host_email`

The viewer shape is built field by field on the server (`src/lib/server/visits.ts`),
so identity fields are absent from the payload, not hidden in the page.

## Data cleaning (done at startup, `src/lib/server/data.ts`)

- **Allowlist:** emails are trimmed and lowercased (the export has
  `Marcus.Vitale@Brightline.example` and ` ines.reyes@brightline.example `).
- **Duplicate sign-ins:** 58 rows repeat an earlier visit exactly (same visitor,
  host, type, company, date) 11–95 seconds later with no sign-out — repeated
  submissions. Rule: same fields, within 120 s, no sign-out → dropped.
  2,011 rows → **1,953 visits**.
- **Missing days:** no records at all on weekdays Aug 10–13, 2026. Cause unknown;
  the API returns a notice whenever a filter overlaps that range.
- **Missing sign-outs:** 870 of the kept visits have no sign-out time, so visit
  length isn't treated as reliable.

## Layout

```
src/lib/server/      data.ts (CSV load + clean), accounts.ts (JSON file), auth.ts (sessions, role checks
                     — the real access control), visits.ts (filters, stats, role-aware serializers),
                     http.ts (JSON helpers)
src/app/api/         one route.ts per endpoint
src/app/             pages: login, signup, visits, visits/[id], admin/users, not-found
src/components/      auth.tsx (sign-in state + page guards — a courtesy, not security), nav.tsx,
                     ui/ (filter bar, account menu, tooltip), visits/ (headline, busy times, table, data hook)
src/lib/client/      api.ts (fetch + safe return paths), format.ts, lastVisits.ts (remembers last list per tab)
src/styles/          tokens.css (design tokens from the brief), layout.css, motion.css
scripts/             demo-setup.mjs, api-check.mjs
NOTE-TO-DANA.md      the note
```

## Pages

| Page | Who | What |
|------|-----|------|
| `/login`, `/signup` | anyone | Sign in, or create an account if you're on the list. Returns you to the page you were trying to open. |
| `/visits` | both | Filters (in the URL, so links can be shared), headline numbers, busiest day/hour, the list. |
| `/visits/:id` | both | One visit. Admins see the person; viewers see "Visitor" and the visit details. |
| `/admin/users` | admin | The allowlist and who has signed up. Viewers get a "no access" page, and the API returns 403. |
| anything else | — | A real 404 page. |

The CSVs live at the repo root, outside `public/`, so they can't be downloaded directly.
