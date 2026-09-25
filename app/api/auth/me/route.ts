import { ok, fail, handle } from "@/lib/api";
import { getSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// GET /api/auth/me — the current session, or 401.
export const GET = handle(async () => {
  const session = await getSession();
  if (!session) return fail("Not authenticated", 401);
  return ok({
    uid: session.uid,
    name: session.name,
    username: session.username,
    role: session.role,
    stages: session.stages ?? [],
  });
});
