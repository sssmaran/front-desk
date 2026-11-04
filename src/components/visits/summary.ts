import { formatDate, TYPE_LABELS } from "@/lib/client/format";

/** True only for a real calendar date written YYYY-MM-DD (rejects "not-a-date", "2026-02-30"). */
function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** One plain sentence describing the current filters, shown under the page title. */
export function describeFilters(params: URLSearchParams) {
  const type = params.get("type");
  const from = params.get("from");
  const to = params.get("to");
  // Validate before formatting; the API's 400 message (shown below the filters) says what to fix.
  if ((from && !isRealDate(from)) || (to && !isRealDate(to)) || (type && !TYPE_LABELS[type])) {
    return "These filters can't be applied. Fix them below or clear them.";
  }
  const what = type ? `${TYPE_LABELS[type]} visits` : "All visits";
  if (from && to) return `${what} from ${formatDate(from, true)} to ${formatDate(to, true)}.`;
  if (from) return `${what} from ${formatDate(from, true)} onwards.`;
  if (to) return `${what} up to ${formatDate(to, true)}.`;
  return `${what}, July 1 to September 30, 2026.`;
}
