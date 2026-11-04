import { requireUser } from "@/lib/server/auth";
import { store } from "@/lib/server/data";
import { error, handle, json } from "@/lib/server/http";
import { serialize } from "@/lib/server/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { user, denied } = requireUser(req);
  if (denied) return denied;
  const id = (await ctx.params).id.trim().toUpperCase();
  if (!/^V\d{6}$/.test(id)) return error(400, "A visit ID looks like V000123.");
  const visit = store().byId.get(id);
  if (!visit) return error(404, `There's no visit with ID ${id}.`);
  return json({ visit: serialize(visit, user.role) });
});
