import { registeredEmails } from "@/lib/server/accounts";
import { requireAdmin } from "@/lib/server/auth";
import { store } from "@/lib/server/data";
import { handle, json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const { denied } = requireAdmin(req); // the real check; the page guard is only a courtesy
  if (denied) return denied;
  const registered = await registeredEmails();
  return json({
    users: [...store().allowed.values()].map((u) => ({
      email: u.email,
      name: u.name,
      role: u.role,
      signedUp: registered.has(u.email),
    })),
  });
});
