"use client";
// The sticky filter bar on /visits. The URL is the source of truth: every change
// writes ?from=&to=&type= (and resets the page), so Back and shared links work.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TYPE_LABELS } from "@/lib/client/format";

const FIRST_DAY = "2026-07-01";
const LAST_DAY = "2026-09-30";

export function FilterBar() {
  const params = useSearchParams();
  const router = useRouter();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const type = params.get("type") ?? "";

  function update(key: "from" | "to" | "type", value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // new filters start on page 1
    router.push(next.size ? `/visits?${next}` : "/visits", { scroll: false });
  }

  const types: [string, string][] = [["", "All"], ...Object.entries(TYPE_LABELS)];

  return (
    <div className="filter-sticky">
      <div className="filterbar" role="search" aria-label="Filter visits">
        <label className="field inline">
          <span>From</span>
          <input type="date" value={from} min={FIRST_DAY} max={LAST_DAY} onChange={(e) => update("from", e.target.value)} />
        </label>
        <label className="field inline">
          <span>To</span>
          <input type="date" value={to} min={FIRST_DAY} max={LAST_DAY} onChange={(e) => update("to", e.target.value)} />
        </label>
        <fieldset className="pill-group">
          <legend>Visit type</legend>
          {types.map(([value, label]) => (
            <button key={value || "all"} type="button" className="pill" aria-pressed={type === value} onClick={() => update("type", value)}>
              {label}
            </button>
          ))}
        </fieldset>
        {(from || to || type) && <Link className="btn-text" href="/visits" scroll={false}>Clear filters</Link>}
      </div>
    </div>
  );
}
