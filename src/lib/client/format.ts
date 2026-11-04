// Display helpers. Timestamps are local wall-clock strings ("2026-08-04 09:30:00"); no timezone maths.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDate(iso: string, withYear = false) {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  const base = `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return withYear ? `${base}, ${d.getUTCFullYear()}` : base;
}

export function formatTime(ts: string) {
  const h = Number(ts.slice(11, 13));
  const m = ts.slice(14, 16);
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? "am" : "pm"}`;
}

export function hourLabel(h: number) {
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n} ${h < 12 ? "am" : "pm"}`;
}

export function hourRange(h: number) {
  return `${hourLabel(h)}–${hourLabel((h + 1) % 24)}`;
}

export function duration(inTs: string, outTs: string | null) {
  if (!outTs) return null;
  const mins = Math.round((Date.parse(outTs.replace(" ", "T")) - Date.parse(inTs.replace(" ", "T"))) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60 ? `${mins % 60} min` : ""}`.trim();
}

export const TYPE_LABELS: Record<string, string> = {
  guest: "Guest",
  interview: "Interview",
  contractor: "Contractor",
  vendor: "Vendor",
};

export const number = (n: number) => n.toLocaleString("en-US");
