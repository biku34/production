import { ok, fail, handle } from "@/lib/api";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

// GET /api/dashboard — role-scoped summary for the signed-in user.
export const GET = handle(async () => {
  const data = await getDashboard();
  if (!data) return fail("Not authenticated", 401);
  return ok(data);
});
