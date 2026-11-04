import "server-only";
import { NextResponse } from "next/server";

// Every API response is identity-dependent, so never let anything cache it.
const NO_STORE = { "Cache-Control": "private, no-store" };

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export function error(status: number, message: string) {
  return json({ error: message }, status);
}

/** Thrown by validators; turned into a 400 by `handle`. */
export class BadRequest extends Error {}

/** Wrap a route handler so validation errors become 400 and surprises become a JSON 500. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response> | Response) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof BadRequest) return error(400, e.message);
      console.error(e);
      return error(500, "Something went wrong on the server.");
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BadRequest("Request body must be valid JSON, e.g. {\"email\": \"...\", \"password\": \"...\"}.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequest("Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}
