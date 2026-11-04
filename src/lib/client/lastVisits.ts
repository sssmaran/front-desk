"use client";
// Remembers the last visits-list URL (filters + page) for THIS browser tab, so the
// "Visits" nav link and "All visits" back link return to it. The URL stays the source
// of truth; this only decides where those links point. Cleared on sign-in and sign-out
// so a different person in the same tab never inherits someone else's view.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const KEY = "frontdesk:lastVisits";
const EVENT = "frontdesk:lastVisits";
const DEFAULT = "/visits";

function valid(href: string | null): href is string {
  // Only ever the list page itself on this site: "/visits" or "/visits?...".
  return !!href && /^\/visits(\?[^\s\\]*)?$/.test(href);
}

export function rememberVisits(href: string) {
  if (!valid(href)) return;
  try {
    sessionStorage.setItem(KEY, href);
  } catch {
    /* storage blocked: links just fall back to /visits */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function forgetVisits() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

function read(): string {
  try {
    const v = sessionStorage.getItem(KEY);
    return valid(v) ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/** Where a "back to the list" link should go. Starts as /visits (server render), then updates. */
export function useLastVisitsHref() {
  const [href, setHref] = useState(DEFAULT);
  const pathname = usePathname();
  useEffect(() => {
    setHref(read());
    const update = () => setHref(read());
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, [pathname]);
  return href;
}
