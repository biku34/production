import { ok, handle } from "@/lib/api";
import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/seed -> wipe & rebuild demo data. Also GET for convenience in-browser.
export const POST = handle(async () => {
  const result = await seedDatabase();
  return ok({ seeded: true, ...result });
});

export const GET = POST;
