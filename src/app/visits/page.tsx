"use client";
// /visits — wiring only: read filters from the URL, fetch, and place the pieces.
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RequireAuth, type Me } from "@/components/auth";
import { ErrorBox } from "@/components/states";
import { FilterBar } from "@/components/ui/FilterBar";
import { BusyTimes } from "@/components/visits/BusyTimes";
import { Headline } from "@/components/visits/Headline";
import { VisitTable } from "@/components/visits/VisitTable";
import { describeFilters } from "@/components/visits/summary";
import { useVisitsData } from "@/components/visits/useVisitsData";
import { rememberVisits } from "@/lib/client/lastVisits";

function VisitsView({ me }: { me: Me }) {
  const params = useSearchParams();
  const { list, stats, error, loading, loadedQuery } = useVisitsData(params);
  const firstLoad = useFirstLoad(Boolean(list && stats));

  // Remember this exact list (filters + page) so "Visits" / "All visits" come back here —
  // but only once the API has accepted it, so a bad URL (e.g. ?type=party) never replaces
  // the last good list.
  const query = params.toString();
  useEffect(() => {
    if (loadedQuery === query) rememberVisits(query ? `/visits?${query}` : "/visits");
  }, [query, loadedQuery]);

  function pageHref(p: number) {
    const next = new URLSearchParams(params);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    return next.size ? `/visits?${next}` : "/visits";
  }

  const notices = list?.notices ?? stats?.notices ?? [];
  const enter = (i: number) => (firstLoad ? { className: "enter", style: { "--stagger": i } as React.CSSProperties } : {});

  return (
    <div className="page">
      <header className="pagehead">
        <h1 className="h-page">Lobby visits</h1>
        <p className="quiet">{describeFilters(params)}</p>
      </header>

      <FilterBar />

      {error && <ErrorBox message={error} />}
      {error && params.get("page") && <p><Link href={pageHref(1)}>Go to the first page</Link></p>}

      {loading && !list ? (
        <p className="quiet pad">Loading visits…</p>
      ) : stats && list ? (
        <div className={loading ? "dim" : undefined} aria-busy={loading}>
          <div {...enter(0)}><Headline stats={stats} notices={notices} dataGaps={list.dataGaps} /></div>
          {stats.total > 0 && <div {...enter(1)}><BusyTimes stats={stats} /></div>}
          <VisitTable me={me} list={list} pageHref={pageHref} from={params.get("from")} to={params.get("to")} />
        </div>
      ) : null}
    </div>
  );
}

/** True only for the first data render, so the entrance plays once and filtering never animates. */
function useFirstLoad(ready: boolean) {
  const [first, setFirst] = useState(true);
  useEffect(() => {
    if (!ready || !first) return;
    const t = setTimeout(() => setFirst(false), 700); // after the 300ms entrance + 100ms stagger
    return () => clearTimeout(t);
  }, [ready, first]);
  return first;
}

export default function VisitsPage() {
  return (
    <Suspense fallback={<p className="quiet pad">Loading…</p>}>
      <RequireAuth>{(me) => <VisitsView me={me} />}</RequireAuth>
    </Suspense>
  );
}
