"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/client/api";
import { RequireAuth, useOnUnauthorized, type Me } from "@/components/auth";
import { ErrorBox } from "@/components/states";
import { duration, formatDate, formatTime, TYPE_LABELS } from "@/lib/client/format";
import { useLastVisitsHref } from "@/lib/client/lastVisits";

interface Visit {
  visit_id: string;
  visit_date: string;
  signed_in_at: string;
  signed_out_at: string | null;
  visit_type: string;
  host_team: string;
  pre_registered: boolean;
  visitor_name?: string;
  visitor_email?: string;
  visitor_company?: string;
  host_name?: string;
  host_email?: string;
}

function VisitDetail({ me }: { me: Me }) {
  const { id } = useParams<{ id: string }>();
  const listHref = useLastVisitsHref(); // back to the list you came from, filters included
  const onUnauthorized = useOnUnauthorized();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ visit: Visit }>(`/api/visits/${encodeURIComponent(id)}`).then((res) => {
      if (cancelled) return;
      if (res.status === 401) return onUnauthorized();
      if (res.error) setError({ status: res.status, message: res.error });
      else setVisit(res.data!.visit);
    });
    return () => {
      cancelled = true;
    };
  }, [id, onUnauthorized]);

  const back = <p className="crumb"><Link href={listHref}>All visits</Link></p>;

  if (error) {
    return (
      <div className="page narrow">
        {back}
        <div className="panel center">
          <h1 className="h-page">{error.status === 404 || error.status === 400 ? "Visit not found" : "Couldn't load this visit"}</h1>
          <ErrorBox message={error.message} />
        </div>
      </div>
    );
  }
  if (!visit) return <div className="page narrow">{back}<p className="quiet pad">Loading visit…</p></div>;

  const stay = duration(visit.signed_in_at, visit.signed_out_at);
  const identity = me.canSeeIdentities && visit.visitor_name;

  return (
    <div className="page narrow">
      {back}
      <header className="pagehead">
        <p className="mono quiet small">{visit.visit_id}</p>
        <h1 className="h-page">{identity ? visit.visitor_name : "Visitor"}</h1>
        <p className="quiet">
          {TYPE_LABELS[visit.visit_type] ?? visit.visit_type} visit on {formatDate(visit.visit_date, true)}
        </p>
      </header>

      {identity ? (
        <section className="panel">
          <h2 className="h-section">Who</h2>
          <dl className="facts">
            <dt>Visitor</dt><dd>{visit.visitor_name}</dd>
            <dt>Email</dt><dd><a href={`mailto:${visit.visitor_email}`}>{visit.visitor_email}</a></dd>
            <dt>Company</dt><dd>{visit.visitor_company}</dd>
            <dt>Host</dt><dd>{visit.host_name} <span className="quiet">({visit.host_email})</span></dd>
          </dl>
        </section>
      ) : (
        <p className="quiet small">Visitor names and contact details are only shown to admins.</p>
      )}

      <section className="panel">
        <h2 className="h-section">The visit</h2>
        <dl className="facts">
          <dt>Type</dt><dd><span className={`chip chip-${visit.visit_type}`}>{TYPE_LABELS[visit.visit_type] ?? visit.visit_type}</span></dd>
          <dt>Host team</dt><dd>{visit.host_team}</dd>
          <dt>Signed in</dt><dd>{formatTime(visit.signed_in_at)}</dd>
          <dt>Signed out</dt>
          <dd>
            {visit.signed_out_at ? (
              <>{formatTime(visit.signed_out_at)} <span className="quiet">({stay})</span></>
            ) : (
              <span className="quiet">Not recorded. Many visitors leave without signing out, so this doesn't mean they stayed.</span>
            )}
          </dd>
          <dt>Pre-registered</dt><dd>{visit.pre_registered ? "Yes, the host registered them in advance" : "No, walked in"}</dd>
        </dl>
      </section>
    </div>
  );
}

export default function VisitPage() {
  return <RequireAuth>{(me) => <VisitDetail me={me} />}</RequireAuth>;
}
