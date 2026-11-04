import { requireUser } from "@/lib/server/auth";
import { error, handle, json } from "@/lib/server/http";
import { dataGaps, filterVisits, notices, parseFilters, parsePaging, serialize } from "@/lib/server/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/visits?from=YYYY-MM-DD&to=YYYY-MM-DD&type=interview&page=1&pageSize=25
export const GET = handle((req: Request) => {
  const { user, denied } = requireUser(req); // auth before anything else
  if (denied) return denied;
  const params = new URL(req.url).searchParams;
  const filters = parseFilters(params, ["page", "pageSize"]);
  const { page, pageSize } = parsePaging(params);
  const rows = filterVisits(filters);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (page > totalPages) {
    return error(400, `Page ${page} doesn't exist. These filters have ${totalPages} page${totalPages === 1 ? "" : "s"}.`);
  }
  const start = (page - 1) * pageSize;
  return json({
    visits: rows.slice(start, start + pageSize).map((v) => serialize(v, user.role)),
    total: rows.length,
    page,
    pageSize,
    totalPages,
    filters,
    notices: notices(filters),
    dataGaps: dataGaps(filters),
  });
});
