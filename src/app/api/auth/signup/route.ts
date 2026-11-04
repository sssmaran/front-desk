import { createAccount } from "@/lib/server/accounts";
import { normalizeEmail, store } from "@/lib/server/data";
import { BadRequest, error, handle, json, readJson } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deliberately cagey wording: we don't confirm to a stranger which emails are on the list.
const REFUSED = "We couldn't create an account. Contact Dana for help.";

export const POST = handle(async (req: Request) => {
  const body = await readJson(req);
  if (typeof body.email !== "string" || !body.email.trim()) throw new BadRequest("Enter your work email.");
  if (typeof body.password !== "string") throw new BadRequest("Enter a password.");
  // Minimum is counted in characters (what a person sees); the maximum is bcrypt's hard
  // limit of 72 bytes, which is 72 plain letters but fewer with accents or emoji.
  if ([...body.password].length < 8) throw new BadRequest("Password must be at least 8 characters.");
  if (Buffer.byteLength(body.password, "utf8") > 72) {
    throw new BadRequest("Password is too long. Use up to 72 plain letters and numbers (accents and emoji count as more than one).");
  }

  // Role and name come only from the allowlist; anything else in the body is ignored.
  const user = store().allowed.get(normalizeEmail(body.email));
  if (!user) return error(403, REFUSED);

  const result = await createAccount(user.email, body.password);
  if (result === "exists") return error(409, "An account already exists for this email. Sign in instead.");
  return json({ email: user.email, name: user.name, role: user.role }, 201);
});
