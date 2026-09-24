import { dbConnect } from "@/lib/mongoose";
import { ok, fail, handle } from "@/lib/api";
import "@/models";
import WorkOrder from "@/models/WorkOrder";
import StageEntry from "@/models/StageEntry";
import MaterialIssue from "@/models/MaterialIssue";
import Lot from "@/models/Lot";
import Roll from "@/models/Roll";
import QcInspection from "@/models/QcInspection";
import JobworkDispatch from "@/models/JobworkDispatch";

export const dynamic = "force-dynamic";

// GET /api/work-orders/:id  -> WO + all related production records
export const GET = handle(async (_req, ctx) => {
  await dbConnect();
  const { id } = await ctx.params;
  const wo = await WorkOrder.findById(id).lean<any>();
  if (!wo) return fail("Work order not found", 404);

  const [stageEntries, issues, lots, rolls, qc, jobwork] = await Promise.all([
    StageEntry.find({ workOrder: id }).sort({ date: 1 }).lean(),
    MaterialIssue.find({ workOrder: id }).sort({ at: 1 }).lean(),
    Lot.find({ workOrder: id }).sort({ createdAt: 1 }).lean(),
    Roll.find({ workOrder: id }).sort({ createdAt: 1 }).lean(),
    QcInspection.find({ workOrder: id }).sort({ at: 1 }).lean(),
    JobworkDispatch.find({ workOrder: id }).sort({ dispatchedAt: 1 }).lean(),
  ]);

  return ok({ workOrder: wo, stageEntries, issues, lots, rolls, qc, jobwork });
});

// PATCH /api/work-orders/:id  -> edit fields (priority, dueDate, notes, assigned)
export const PATCH = handle(async (req, ctx) => {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();
  const allowed = ["priority", "dueDate", "notes", "assignedName", "targetQty"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  const wo = await WorkOrder.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!wo) return fail("Work order not found", 404);
  return ok(wo);
});
