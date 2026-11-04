// Server-only: sessions and the role checks every API route calls.
// This file — not the page guards — is what actually enforces access.
import "server-only";
import { randomBytes } from "node:crypto";
import { store, type AllowedUser } from "./data";
import { error } from "./http";

export const SESSION_COOKIE = "fd_session";
export const SESSION_HOURS = 8;

interface Session {
  email: string;
  expiresAt: number;
}

// In-memory sessions: they vanish on server restart (prototype).
const g = globalThis as unknown as { __frontDeskSessions?: Map<string, Session> };
const sessions = (g.__frontDeskSessions ??= new Map());

export function createSession(email: string): string {
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, { email, expiresAt: Date.now() + SESSION_HOURS * 3600_000 });
  return token;
}

export function destroySession(token: string | null) {
  if (token) sessions.delete(token);
}

/** Session token from the cookie (browser) or `Authorization: Bearer` (curl). */
export function tokenFrom(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim() || null;
  const cookie = req.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === SESSION_COOKIE) {
      try {
        return decodeURIComponent(v.join("=")) || null;
      } catch {
        return null; // malformed cookie (e.g. "%ZZ") = no session, so callers return 401
      }
    }
  }
  return null;
}

/**
 * The current user, or null. Name and role always come from the allowlist,
 * so removing someone from allowed_users.csv (and restarting) revokes access.
 */
export function currentUser(req: Request): AllowedUser | null {
  const token = tokenFrom(req);
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return store().allowed.get(s.email) ?? null;
}

type Guard = { user: AllowedUser; denied?: never } | { user?: never; denied: Response };

export function requireUser(req: Request): Guard {
  const user = currentUser(req);
  if (!user) return { denied: error(401, "You need to sign in first.") };
  return { user };
}

export function requireAdmin(req: Request): Guard {
  const g = requireUser(req);
  if (g.denied) return g;
  if (g.user.role !== "admin") return { denied: error(403, "Only admins can see this.") };
  return g;
}

export function sessionCookie(token: string, maxAgeSeconds: number) {
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}
