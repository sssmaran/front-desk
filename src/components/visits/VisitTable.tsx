import Link from "next/link";
import type { Me } from "@/components/auth";
import { formatDate, formatTime, number, TYPE_LABELS } from "@/lib/client/format";
import type { VisitsResponse } from "./types";

export function VisitTable({ me, list, pageHref, from, to }: {
  me: Me; list: VisitsResponse; pageHref: (p: number) => string; from: string | null; to: string | null;
}) {
  if (list.total === 0) {
    const withinGap = from && to && list.dataGaps.some((gap) => from >= gap.from && to <= gap.to);
    return (
      <div className="empty">
        <p><strong>{withinGap ? "No records available for these dates." : "No visits match these filters."}</strong></p>
        <p className="quiet">{withinGap ? "These dates fall within a possible data gap. This doesn't confirm that no visits occurred." : "Try a wider date range or a different visit type."}</p>
        <p><Link href="/visits">Clear filters</Link></p>
      </div>
    );
  }
  const first = (list.page - 1) * list.pageSize + 1;
  const last = Math.min(list.total, list.page * list.pageSize);
  return (
    <section aria-label="Visit list">
      <p className="table-hint">Scroll horizontally to see all visit details.</p>
      <div className="tablewrap" tabIndex={0} role="region" aria-label="Visit details table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Signed in</th>
              <th>Visitor</th>
              <th>Type</th>
              <th>Host</th>
              <th>Signed out</th>
            </tr>
          </thead>
          <tbody>
            {list.visits.map((v) => (
              <tr key={v.visit_id}>
                <td className="nowrap">{formatDate(v.visit_date)}</td>
                <td className="nowrap num">{formatTime(v.signed_in_at)}</td>
                <td>
                  <Link href={`/visits/${v.visit_id}`} className="rowlink">
                    {me.canSeeIdentities && v.visitor_name ? v.visitor_name : <>Visitor <span className="mono">{v.visit_id}</span></>}
                  </Link>
                  {v.visitor_company && <div className="quiet small">{v.visitor_company}</div>}
                </td>
                <td><span className={`chip chip-${v.visit_type}`}>{TYPE_LABELS[v.visit_type] ?? v.visit_type}</span></td>
                <td>
                  {v.host_name && <div>{v.host_name}</div>}
                  <div className={v.host_name ? "quiet small" : undefined}>{v.host_team}</div>
                </td>
                <td className="nowrap num">{v.signed_out_at ? formatTime(v.signed_out_at) : <span className="quiet">Not recorded</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="pager" aria-label="Pages">
        <span className="quiet small">Showing {number(first)}–{number(last)} of {number(list.total)}</span>
        <span className="pager-links">
          {list.page > 1 ? <Link href={pageHref(list.page - 1)}>Previous</Link> : <span className="quiet">Previous</span>}
          <span className="small">Page {list.page} of {list.totalPages}</span>
          {list.page < list.totalPages ? <Link href={pageHref(list.page + 1)}>Next</Link> : <span className="quiet">Next</span>}
        </span>
      </nav>
    </section>
  );
}
