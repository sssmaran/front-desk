"use client";
// Fetches the list and the stats for whatever filters are in the URL.
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useOnUnauthorized } from "@/components/auth";
import { FILTER_KEYS, type StatsResponse, type VisitsResponse } from "./types";

export function useVisitsData(params: URLSearchParams) {
  const onUnauthorized = useOnUnauthorized();
  const query = params.toString();
  const [list, setList] = useState<VisitsResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // The query whose results loaded successfully (both list and stats, no error).
  // Lets callers tell "this URL worked" apart from stale results of a previous URL.
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const current = new URLSearchParams(query);
    const filterOnly = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      const v = current.get(k);
      if (v) filterOnly.set(k, v);
    }
    Promise.all([
      api<VisitsResponse>(`/api/visits?${query}`),
      api<StatsResponse>(`/api/stats?${filterOnly}`),
    ]).then(([l, s]) => {
      if (cancelled) return;
      if (l.status === 401 || s.status === 401) return onUnauthorized();
      const err = l.error ?? s.error;
      setError(err);
      setList(l.data);
      setStats(s.data);
      setLoadedQuery(err || !l.data || !s.data ? null : query);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query, onUnauthorized]);

  return { list, stats, error, loading, loadedQuery };
}
