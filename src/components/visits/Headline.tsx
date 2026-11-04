import { hourRange, number } from "@/lib/client/format";
import type { StatsResponse, VisitsResponse } from "./types";

export function Headline({ stats, notices, dataGaps, className }: {
  stats: StatsResponse; notices: string[]; dataGaps: VisitsResponse["dataGaps"]; className?: string;
}) {
  const topTeam = Object.entries(stats.byTeam).sort((a, b) => b[1] - a[1])[0];
  return (
    <dl className={["vitals", className].filter(Boolean).join(" ")}>
      <div className="vital">
        <dt>Visits</dt>
        <dd>{number(stats.total)}</dd>
      </div>
      <div className="vital">
        <dt>Busiest day</dt>
        <dd>{stats.busiestDay ?? "—"}</dd>
      </div>
      <div className="vital">
        <dt>Busiest hour</dt>
        <dd>{stats.busiestHour === null ? "—" : hourRange(stats.busiestHour)}</dd>
      </div>
      <div className="vital">
        <dt>Busiest host team</dt>
        <dd>{topTeam ? `${topTeam[0]} (${number(topTeam[1])})` : "—"}</dd>
      </div>
      {notices.length > 0 && <div className="data-quality-row">
        <dt className="sr-only">Data quality</dt>
        <dd className="data-quality">
          <details>
            <summary>{dataGaps.length ? `Possible data gap: ${dataGaps.map((gap) => gap.label).join(", ")}` : "Data coverage note"}</summary>
            <div className="data-quality-body">{notices.map((notice) => <p key={notice}>{notice}</p>)}</div>
          </details>
        </dd>
      </div>}
    </dl>
  );
}
