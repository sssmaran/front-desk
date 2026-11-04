// Browser-side fetch helper. Pages only ever talk to /api/* — they never see the CSVs.
export interface ApiResult<T> {
  status: number;
  data: T | null;
  error: string | null;
}

export async function api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) return { status: res.status, data: null, error: body?.error ?? `Request failed (${res.status}).` };
    return { status: res.status, data: body as T, error: null };
  } catch {
    return { status: 0, data: null, error: "Couldn't reach the server. Check that it's running and try again." };
  }
}

/** Only allow same-site paths as post-login destinations (no //evil.com, no https://...). */
export function safeNext(next: string | null | undefined): string {
  const fallback = "/visits";
  // Browsers strip tabs/newlines from URLs, so "/\n/evil.com" would become "//evil.com".
  // eslint-disable-next-line no-control-regex
  if (!next || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  let url: URL;
  try {
    url = new URL(next, window.location.origin);
  } catch {
    return fallback;
  }
  // Judge the parsed result, not the string: it must stay on this site.
  if (url.origin !== window.location.origin) return fallback;
  if (url.pathname.startsWith("/login") || url.pathname.startsWith("/signup")) return fallback;
  return url.pathname + url.search + url.hash;
}
