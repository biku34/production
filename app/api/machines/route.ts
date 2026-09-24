import { dbConnect } from "@/lib/mongoose";
import { ok, created, handle } from "@/lib/api";
import "@/models";
import Machine from "@/models/Machine";
import StageEntry from "@/models/StageEntry";

export const dynamic = "force-dynamic";

// GET /api/machines?withQueue=1  -> machines, optionally with WO queue counts
export const GET = handle(async (req) => {
  await dbConnect();
  const url = new URL(req.url);
  const rows = await Machine.find().sort({ code: 1 }).lean();

  if (url.searchParams.get("withQueue")) {
    const queues = await StageEntry.aggregate([
      { $group: { _id: "$machine", entries: { $sum: 1 }, lastDate: { $max: "$date" } } },
    ]);
    const byId = new Map(queues.map((q) => [String(q._id), q]));
    return ok(
      rows.map((m: any) => ({
        ...m,
        queue: byId.get(String(m._id)) || { entries: 0 },
      }))
    );
  }
  return ok(rows);
});

export const POST = handle(async (req) => {
  await dbConnect();
  const b = await req.json();
  const row = await Machine.create(b);
  return created(row);
});
