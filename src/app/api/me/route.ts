import { requireUser } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle((req: Request) => {
  const { user, denied } = requireUser(req);
  if (denied) return denied;
  return json({
    email: user.email,
    name: user.name,
    role: user.role,
    canSeeIdentities: user.role === "admin",
    canManageUsers: user.role === "admin",
  });
});
