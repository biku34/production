import { dbConnect } from "@/lib/mongoose";
import { ok, fail, handle } from "@/lib/api";
import "@/models";
import JobworkDispatch from "@/models/JobworkDispatch";

export const dynamic = "force-dynamic";

// POST /api/jobwork/:id/return  { qtyReturned, shortageQty, quality, actualCost }
export const POST = handle(async (req, ctx) => {
  await dbConnect();
  const { id } = await ctx.params;
  const b = await req.json();

  const rec = await JobworkDispatch.findById(id);
  if (!rec) return fail("Job-work dispatch not found", 404);
  if (b.qtyReturned == null) return fail("qtyReturned is required");

  const qtyReturned = Number(b.qtyReturned);
  const shortageQty =
    b.shortageQty != null
      ? Number(b.shortageQty)
      : Math.max(0, rec.qtySent - qtyReturned);

  rec.returned = true;
  rec.qtyReturned = qtyReturned;
  rec.shortageQty = shortageQty;
  rec.quality = b.quality;
  rec.actualCost = Number(b.actualCost || rec.rate * qtyReturned);
  rec.returnedAt = new Date();
  rec.status = qtyReturned >= rec.qtySent ? "Returned" : "PartialReturn";
  await rec.save();

  return ok(rec);
});
