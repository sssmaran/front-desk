import { hourLabel, number } from "@/lib/client/format";
import { InfoTip } from "@/components/ui/InfoTip";
import type { StatsResponse } from "./types";

/** When the lobby gets busy: one panel, split into weekday and sign-in hour. */
export function BusyTimes({ stats, className }: { stats: StatsResponse; className?: string }) {
  const days = stats.byDay.filter((d, i) => i < 5 || d.count > 0);
  // Always show the working day (8 am–5 pm), widened if any sign-ins fall outside it.
  const active = stats.byHour.filter((h) => h.count > 0).map((h) => h.hour);
  const lo = Math.min(8, ...active);
  const hi = Math.max(16, ...active);
  const hours = stats.byHour.filter((h) => h.hour >= lo && h.hour <= hi);

  return (
    <section className={["busy", className].filter(Boolean).join(" ")} aria-labelledby="busy-title">
      <header className="busy-head">
        <h2 className="h-section" id="busy-title">When the lobby gets busy</h2>
        <InfoTip label="About these counts">
          Counts are recorded sign-ins, grouped by the hour each visitor signed in. Hours with no bar had no sign-ins recorded.
        </InfoTip>
      </header>
      <div className="busy-grid">
        <div className="busy-zone">
          <Bars title="By day of the week" items={days.map((d) => ({ key: d.day, label: d.day.slice(0, 3), count: d.count }))} top={stats.busiestDay} />
        </div>
        <div className="busy-zone" tabIndex={0} role="region" aria-label="Sign-in hours chart">
          <Bars title="By sign-in hour" items={hours.map((h) => ({ key: String(h.hour), label: hourLabel(h.hour), count: h.count }))} top={stats.busiestHour === null ? null : String(stats.busiestHour)} />
        </div>
      </div>
    </section>
  );
}

function Bars({ title, items, top }: { title: string; items: { key: string; label: string; count: number }[]; top: string | null }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <figure className="bars">
      <figcaption>{title}</figcaption>
      <ol>
        {items.map((i) => (
          <li key={i.key} className={i.key === top ? "is-top" : undefined}>
            <span className="bar-count">{i.count ? number(i.count) : " "}</span>
            <span className="bar" style={{ height: `${Math.max(2, (i.count / max) * 100)}%` }} />
            <span className="bar-label">{i.label}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
