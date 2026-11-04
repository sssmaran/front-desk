import { requireUser } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import { parseFilters, stats } from "@/lib/server/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Aggregates only — no rows, so it is identical for admins and viewers.
export const GET = handle((req: Request) => {
  const { denied } = requireUser(req);
  if (denied) return denied;
  const filters = parseFilters(new URL(req.url).searchParams);
  return json({ filters, ...stats(filters) });
});
