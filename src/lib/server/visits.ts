// Server-only: filtering, paging, stats, and role-aware serialization.
import "server-only";
import { store, VISIT_TYPES, type Role, type Visit } from "./data";
import { BadRequest } from "./http";

// ---------- serialization: the privacy boundary ----------

/** Viewer shape: built field-by-field. No visitor/host name, email, or company. */
export function forViewer(v: Visit) {
  return {
    visit_id: v.visit_id,
    visit_date: v.visit_date,
    signed_in_at: v.signed_in_at,
    signed_out_at: v.signed_out_at,
    visit_type: v.visit_type,
    host_team: v.host_team,
    pre_registered: v.pre_registered,
  };
}

export function forAdmin(v: Visit) {
  return {
    ...forViewer(v),
    visitor_name: v.visitor_name,
    visitor_email: v.visitor_email,
    visitor_company: v.visitor_company,
    host_name: v.host_name,
    host_email: v.host_email,
  };
}

export function serialize(v: Visit, role: Role) {
  return role === "admin" ? forAdmin(v) : forViewer(v);
}

// ---------- query validation ----------

export interface Filters {
  from: string | null;
  to: string | null;
  type: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(name: string, value: string): string {
  const d = new Date(value + "T00:00:00Z");
  if (!DATE_RE.test(value) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new BadRequest(`"${name}" must be a real date written as YYYY-MM-DD, e.g. 2026-08-01.`);
  }
  return value;
}

function single(params: URLSearchParams, key: string): string | null {
  const all = params.getAll(key);
  if (all.length > 1) throw new BadRequest(`Give "${key}" only once.`);
  const v = all[0]?.trim();
  return v ? v : null;
}

export function parseFilters(params: URLSearchParams, extraKeys: string[] = []): Filters {
  const allowed = new Set(["from", "to", "type", ...extraKeys]);
  for (const key of params.keys()) {
    if (!allowed.has(key)) {
      throw new BadRequest(`Unknown parameter "${key}". Allowed: ${[...allowed].join(", ")}.`);
    }
  }
  const fromRaw = single(params, "from");
  const toRaw = single(params, "to");
  const from = fromRaw ? parseDate("from", fromRaw) : null;
  const to = toRaw ? parseDate("to", toRaw) : null;
  if (from && to && to < from) {
    throw new BadRequest(`The end date (${to}) is before the start date (${from}). Swap them or pick a later end date.`);
  }
  const typeRaw = single(params, "type");
  const type = typeRaw ? typeRaw.toLowerCase() : null;
  if (type && !(VISIT_TYPES as readonly string[]).includes(type)) {
    throw new BadRequest(`"${typeRaw}" isn't a visit type. Use one of: ${VISIT_TYPES.join(", ")}.`);
  }
  return { from, to, type };
}

function parsePositiveInt(params: URLSearchParams, key: string, fallback: number, max: number): number {
  const raw = single(params, key);
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > max) {
    throw new BadRequest(`"${key}" must be a whole number from 1 to ${max}.`);
  }
  return Number(raw);
}

export function parsePaging(params: URLSearchParams) {
  return {
    page: parsePositiveInt(params, "page", 1, 100000),
    pageSize: parsePositiveInt(params, "pageSize", 25, 100),
  };
}

export function filterVisits(f: Filters): Visit[] {
  return store().visits.filter(
    (v) =>
      (!f.from || v.visit_date >= f.from) &&
      (!f.to || v.visit_date <= f.to) &&
      (!f.type || v.visit_type === f.type),
  );
}

// ---------- data-quality notices (plain words for the UI) ----------

function groupRanges(days: string[]): [string, string][] {
  const out: [string, string][] = [];
  for (const d of days) {
    const last = out[out.length - 1];
    const prev = last && new Date(last[1] + "T00:00:00Z");
    if (prev) prev.setUTCDate(prev.getUTCDate() + 1);
    if (last && prev!.toISOString().slice(0, 10) === d) last[1] = d;
    else out.push([d, d]);
  }
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function plainDate(iso: string) {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
}
function plainSpan(a: string, b: string) {
  if (a === b) return plainDate(a);
  if (a.slice(0, 7) === b.slice(0, 7)) {
    return `${MONTHS[Number(a.slice(5, 7)) - 1]} ${Number(a.slice(8, 10))}–${Number(b.slice(8, 10))}, ${a.slice(0, 4)}`;
  }
  return `${plainDate(a)} to ${plainDate(b)}`;
}

// Structured ranges let the UI distinguish a possible gap from ordinary empty results.
export function dataGaps(f: Filters) {
  const q = store().quality;
  return groupRanges(q.missingWeekdays)
    .filter(([a, b]) => a <= (f.to ?? q.lastDate) && b >= (f.from ?? q.firstDate))
    .map(([from, to]) => ({ from, to, label: plainSpan(from, to) }));
}

export function notices(f: Filters): string[] {
  const q = store().quality;
  const from = f.from ?? q.firstDate;
  const to = f.to ?? q.lastDate;
  const out: string[] = [];
  for (const gap of dataGaps(f)) {
    out.push(
      `No sign-ins were recorded on ${gap.label}. These are weekdays, but the export doesn't explain the gap. ` +
        `Totals covering these dates may undercount visits.`,
    );
  }
  if (from < q.firstDate || to > q.lastDate) {
    out.push(`Records only cover ${plainSpan(q.firstDate, q.lastDate)}.`);
  }
  return out;
}

// ---------- stats ----------

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function stats(f: Filters) {
  const rows = filterVisits(f);
  const byDay = DAYS.map((day) => ({ day, count: 0 }));
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const byType: Record<string, number> = Object.fromEntries(VISIT_TYPES.map((t) => [t, 0]));
  const byTeam: Record<string, number> = {};
  for (const v of rows) {
    const jsDay = new Date(v.visit_date + "T00:00:00Z").getUTCDay(); // 0 = Sunday
    byDay[(jsDay + 6) % 7].count++;
    byHour[Number(v.signed_in_at.slice(11, 13))].count++;
    byType[v.visit_type] = (byType[v.visit_type] ?? 0) + 1;
    byTeam[v.host_team] = (byTeam[v.host_team] ?? 0) + 1;
  }
  // Ties go to the earlier day / earlier hour.
  const top = <T extends { count: number }>(xs: T[]) =>
    xs.reduce<T | null>((best, x) => (x.count > 0 && (!best || x.count > best.count) ? x : best), null);
  return {
    total: rows.length,
    busiestDay: top(byDay)?.day ?? null,
    busiestHour: top(byHour)?.hour ?? null,
    byDay,
    byHour,
    byType,
    byTeam,
    notices: notices(f),
  };
}
