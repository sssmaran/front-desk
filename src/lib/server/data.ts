// Server-only: loads and cleans the two CSV exports once per process.
// Never import this from a client component.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

export type Role = "admin" | "viewer";

export interface AllowedUser {
  email: string; // normalized: trimmed + lowercased
  name: string;
  role: Role;
}

export interface Visit {
  visit_id: string;
  visit_date: string; // YYYY-MM-DD (local wall-clock, as exported)
  signed_in_at: string; // "YYYY-MM-DD HH:MM:SS"
  signed_out_at: string | null; // null when the visitor never signed out
  visitor_name: string;
  visitor_email: string;
  visitor_company: string;
  visit_type: string;
  host_name: string;
  host_email: string;
  host_team: string;
  pre_registered: boolean;
}

export interface DataQuality {
  sourceRows: number;
  duplicatesRemoved: number;
  duplicateIds: string[];
  cleanRows: number;
  missingSignOut: number;
  firstDate: string;
  lastDate: string;
  missingWeekdays: string[]; // weekdays inside the range with zero records
}

interface Store {
  allowed: Map<string, AllowedUser>;
  visits: Visit[]; // sorted: signed_in_at desc, visit_id asc
  byId: Map<string, Visit>;
  quality: DataQuality;
}

export const VISIT_TYPES = ["guest", "interview", "contractor", "vendor"] as const;

// Duplicate rule: a later row with identical visitor/host/type/company/date,
// signed in within this many seconds of the kept row and with no sign-out,
// is treated as a repeated iPad submission.
const DUPLICATE_WINDOW_SECONDS = 120;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readCsv(file: string): Record<string, string>[] {
  const text = fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), file), "utf8");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length) {
    throw new Error(`${file}: ${parsed.errors[0].message} (row ${parsed.errors[0].row})`);
  }
  return parsed.data;
}

function loadAllowed(): Map<string, AllowedUser> {
  const map = new Map<string, AllowedUser>();
  for (const row of readCsv("allowed_users.csv")) {
    const email = normalizeEmail(row.email ?? "");
    const role = (row.role ?? "").trim().toLowerCase();
    if (!email || (role !== "admin" && role !== "viewer")) {
      throw new Error(`allowed_users.csv: bad row ${JSON.stringify(row)}`);
    }
    map.set(email, { email, name: (row.name ?? "").trim(), role });
  }
  return map;
}

function toSeconds(ts: string): number {
  // Treat timestamps as plain wall-clock values; no timezone conversion.
  return Date.parse(ts.replace(" ", "T") + "Z") / 1000;
}

function loadVisits(): { visits: Visit[]; quality: DataQuality } {
  const rows = readCsv("visits.csv");
  const all: Visit[] = rows.map((r) => ({
    visit_id: r.visit_id.trim(),
    visit_date: r.visit_date.trim(),
    signed_in_at: r.signed_in_at.trim(),
    signed_out_at: r.signed_out_at?.trim() ? r.signed_out_at.trim() : null,
    visitor_name: r.visitor_name.trim(),
    visitor_email: normalizeEmail(r.visitor_email),
    visitor_company: r.visitor_company.trim(),
    visit_type: r.visit_type.trim().toLowerCase(),
    host_name: r.host_name.trim(),
    host_email: normalizeEmail(r.host_email),
    host_team: r.host_team.trim(),
    pre_registered: r.pre_registered.trim().toLowerCase() === "true",
  }));

  // Deduplicate repeated submissions (see DUPLICATE_WINDOW_SECONDS).
  const key = (v: Visit) =>
    [v.visit_date, v.visitor_name, v.visitor_email, v.visitor_company, v.visit_type,
     v.host_name, v.host_email, v.host_team, v.pre_registered].join("|");
  const chronological = [...all].sort(
    (a, b) => a.signed_in_at.localeCompare(b.signed_in_at) || a.visit_id.localeCompare(b.visit_id),
  );
  const lastKept = new Map<string, Visit>();
  const kept: Visit[] = [];
  const duplicateIds: string[] = [];
  for (const v of chronological) {
    const prev = lastKept.get(key(v));
    if (
      prev &&
      v.signed_out_at === null &&
      toSeconds(v.signed_in_at) - toSeconds(prev.signed_in_at) <= DUPLICATE_WINDOW_SECONDS
    ) {
      duplicateIds.push(v.visit_id);
      continue;
    }
    lastKept.set(key(v), v);
    kept.push(v);
  }

  kept.sort(
    (a, b) => b.signed_in_at.localeCompare(a.signed_in_at) || a.visit_id.localeCompare(b.visit_id),
  );

  const dates = new Set(kept.map((v) => v.visit_date));
  const sortedDates = [...dates].sort();
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  const missingWeekdays: string[] = [];
  for (let d = new Date(firstDate + "T00:00:00Z"); d <= new Date(lastDate + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6 && !dates.has(iso)) missingWeekdays.push(iso);
  }

  return {
    visits: kept,
    quality: {
      sourceRows: all.length,
      duplicatesRemoved: duplicateIds.length,
      duplicateIds: duplicateIds.sort(),
      cleanRows: kept.length,
      missingSignOut: kept.filter((v) => v.signed_out_at === null).length,
      firstDate,
      lastDate,
      missingWeekdays,
    },
  };
}

// Keep one copy per process, surviving Next.js dev hot reloads.
const g = globalThis as unknown as { __frontDeskStore?: Store };

export function store(): Store {
  if (!g.__frontDeskStore) {
    const allowed = loadAllowed();
    const { visits, quality } = loadVisits();
    g.__frontDeskStore = { allowed, visits, byId: new Map(visits.map((v) => [v.visit_id, v])), quality };
    console.log(
      `[front-desk] loaded ${allowed.size} allowed users; ${quality.sourceRows} visit rows, ` +
        `${quality.duplicatesRemoved} duplicate submissions removed, ${quality.cleanRows} visits kept`,
    );
  }
  return g.__frontDeskStore;
}
