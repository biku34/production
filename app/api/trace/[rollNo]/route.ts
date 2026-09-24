import { dbConnect } from "@/lib/mongoose";
import { ok, fail, handle } from "@/lib/api";
import "@/models";
import Roll from "@/models/Roll";
import Lot from "@/models/Lot";
import WorkOrder from "@/models/WorkOrder";
import StageEntry from "@/models/StageEntry";
import MaterialIssue from "@/models/MaterialIssue";
import JobworkDispatch from "@/models/JobworkDispatch";
import QcInspection from "@/models/QcInspection";

export const dynamic = "force-dynamic";

// GET /api/trace/:rollNo -> full traceability (AC-4):
// roll → lot → shade → stages → materials → job-work vendor.
export const GET = handle(async (_req, ctx) => {
  await dbConnect();
  const { rollNo } = await ctx.params;
  const roll = await Roll.findOne({ rollNo: decodeURIComponent(rollNo) }).lean<any>();
  if (!roll) return fail("Roll not found", 404);

  const [lot, wo] = await Promise.all([
    roll.lot ? Lot.findById(roll.lot).lean<any>() : null,
    WorkOrder.findById(roll.workOrder).lean<any>(),
  ]);

  const [stageEntries, issues, jobwork, qc] = await Promise.all([
    StageEntry.find({ workOrder: roll.workOrder }).sort({ date: 1 }).lean(),
    MaterialIssue.find({ workOrder: roll.workOrder }).sort({ at: 1 }).lean(),
    JobworkDispatch.find({ workOrder: roll.workOrder }).sort({ dispatchedAt: 1 }).lean(),
    QcInspection.find({ workOrder: roll.workOrder }).sort({ at: 1 }).lean(),
  ]);

  return ok({
    roll,
    lot,
    shade: lot?.shadeCode,
    workOrder: wo,
    salesOrderRef: wo?.customerRef,
    stages: stageEntries,
    materials: issues,
    jobwork,
    qc,
  });
});
