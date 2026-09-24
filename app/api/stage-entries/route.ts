import { dbConnect } from "@/lib/mongoose";
import { ok, created, fail, handle } from "@/lib/api";
import "@/models";
import StageEntry from "@/models/StageEntry";
import WorkOrder from "@/models/WorkOrder";
import Machine from "@/models/Machine";
import { deriveLoss } from "@/lib/production";
import type { Stage } from "@/lib/domain";

export const dynamic = "force-dynamic";

// GET /api/stage-entries?woId=&stage=
export const GET = handle(async (req) => {
  await dbConnect();
  const url = new URL(req.url);
  const woId = url.searchParams.get("woId");
  const stage = url.searchParams.get("stage");
  const filter: Record<string, unknown> = {};
  if (woId) filter.workOrder = woId;
  if (stage) filter.stage = stage;
  const entries = await StageEntry.find(filter).sort({ date: -1 }).lean();
  return ok(entries);
});

// POST /api/stage-entries  { woId, stage, qtyIn, inUnit, qtyOut, outUnit, ... }
export const POST = handle(async (req) => {
  await dbConnect();
  const b = await req.json();

  const wo = await WorkOrder.findById(b.woId).lean<any>();
  if (!wo) return fail("Work order not found", 404);
  if (b.qtyIn == null || b.qtyOut == null)
    return fail("qtyIn and qtyOut are required");

  const routeStage = (wo.routing || []).find(
    (r: any) => r.stage === b.stage
  );
  const stdLossPct = b.stdLossPct ?? routeStage?.stdLossPct ?? 0;
  const inUnit = b.inUnit ?? routeStage?.inUnit ?? "m";
  const outUnit = b.outUnit ?? routeStage?.outUnit ?? "m";

  const { lossQty, lossPct, lossFlagged } = deriveLoss({
    qtyIn: Number(b.qtyIn),
    qtyOut: Number(b.qtyOut),
    wastageQty: Number(b.wastageQty || 0),
    inUnit,
    outUnit,
    stdLossPct,
    conversionOutPerIn: b.conversionOutPerIn,
  });

  let machineName = b.machineName;
  if (b.machineId && !machineName) {
    const m = await Machine.findById(b.machineId).lean<any>();
    machineName = m?.name;
  }

  const entry = await StageEntry.create({
    workOrder: wo._id,
    woNo: wo.woNo,
    stage: b.stage as Stage,
    qtyIn: Number(b.qtyIn),
    inUnit,
    qtyOut: Number(b.qtyOut),
    outUnit,
    wastageQty: Number(b.wastageQty || 0),
    lossQty,
    lossPct,
    lossFlagged,
    machine: b.machineId || undefined,
    machineName,
    shift: b.shift || "General",
    date: b.date ? new Date(b.date) : new Date(),
    operatorName: b.operatorName,
    partial: !!b.partial,
    note: b.note,
  });

  return created(entry);
});
