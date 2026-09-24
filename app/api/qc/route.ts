import { dbConnect } from "@/lib/mongoose";
import { ok, created, fail, handle } from "@/lib/api";
import "@/models";
import QcInspection from "@/models/QcInspection";
import WorkOrder from "@/models/WorkOrder";
import Roll from "@/models/Roll";

export const dynamic = "force-dynamic";

// GET /api/qc?woId=
export const GET = handle(async (req) => {
  await dbConnect();
  const url = new URL(req.url);
  const woId = url.searchParams.get("woId");
  const filter: Record<string, unknown> = {};
  if (woId) filter.workOrder = woId;
  const rows = await QcInspection.find(filter).sort({ at: -1 }).lean();
  return ok(rows);
});

// POST /api/qc  { woId, inspectedQty, grade, result, rejectQty, defects[], ... }
export const POST = handle(async (req) => {
  await dbConnect();
  const b = await req.json();
  const wo = await WorkOrder.findById(b.woId).lean<any>();
  if (!wo) return fail("Work order not found", 404);
  if (b.inspectedQty == null) return fail("inspectedQty is required");

  const rec = await QcInspection.create({
    workOrder: wo._id,
    woNo: wo.woNo,
    lot: b.lotId || undefined,
    lotNo: b.lotNo,
    roll: b.rollId || undefined,
    rollNo: b.rollNo,
    inspectedQty: Number(b.inspectedQty),
    unit: b.unit || "m",
    grade: b.grade || "A",
    result: b.result || "Pass",
    rejectQty: Number(b.rejectQty || 0),
    defects: Array.isArray(b.defects) ? b.defects : [],
    inspectorName: b.inspectorName,
    responsibleStage: b.responsibleStage,
    responsibleMachineName: b.responsibleMachineName,
    note: b.note,
  });

  // If a specific roll was graded/held, reflect it on the roll.
  if (b.rollId) {
    const status =
      b.result === "Hold" ? "Hold" : b.result === "Reject" ? "Hold" : "InStock";
    await Roll.findByIdAndUpdate(b.rollId, {
      grade: b.grade || "A",
      status,
    });
  }

  return created(rec);
});
