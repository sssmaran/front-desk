import { verifyPassword } from "@/lib/server/accounts";
import { createSession, SESSION_HOURS, sessionCookie } from "@/lib/server/auth";
import { normalizeEmail, store } from "@/lib/server/data";
import { BadRequest, error, handle, json, readJson } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const body = await readJson(req);
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    throw new BadRequest("Send both \"email\" and \"password\".");
  }
  const email = normalizeEmail(body.email);
  const user = store().allowed.get(email);
  // One generic message for unknown email, no account, or wrong password.
  if (!(await verifyPassword(email, body.password)) || !user) {
    return error(401, "That email and password don't match an account.");
  }
  const token = createSession(email);
  return json({ email: user.email, name: user.name, role: user.role, token }, 200, {
    "Set-Cookie": sessionCookie(token, SESSION_HOURS * 3600),
  });
});
