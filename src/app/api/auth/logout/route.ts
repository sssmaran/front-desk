import { destroySession, sessionCookie, tokenFrom } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  destroySession(tokenFrom(req));
  return new Response(null, { status: 204, headers: { "Set-Cookie": sessionCookie("", 0) } });
}
