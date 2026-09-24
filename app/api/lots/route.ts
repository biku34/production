import { dbConnect } from "@/lib/mongoose";
import { ok, created, fail, handle } from "@/lib/api";
import "@/models";
import Lot from "@/models/Lot";
import WorkOrder from "@/models/WorkOrder";
import { nextId } from "@/models/Counter";

export const dynamic = "force-dynamic";

// GET /api/lots?woId=&shade=
export const GET = handle(async (req) => {
  await dbConnect();
  const url = new URL(req.url);
  const woId = url.searchParams.get("woId");
  const shade = url.searchParams.get("shade");
  const filter: Record<string, unknown> = {};
  if (woId) filter.workOrder = woId;
  if (shade) filter.shadeCode = new RegExp(shade, "i");
  const lots = await Lot.find(filter).sort({ createdAt: -1 }).lean();
  return ok(lots);
});

// POST /api/lots  { woId, shadeCode, qty, unit, swatchRef, matchesPreviousLot }
export const POST = handle(async (req) => {
  await dbConnect();
  const b = await req.json();
  const wo = await WorkOrder.findById(b.woId).lean<any>();
  if (!wo) return fail("Work order not found", 404);
  if (!b.shadeCode) return fail("shadeCode is required");

  const lotNo = await nextId("LOT");
  const lot = await Lot.create({
    lotNo,
    workOrder: wo._id,
    woNo: wo.woNo,
    salesOrder: wo.salesOrder,
    shadeCode: b.shadeCode,
    swatchRef: b.swatchRef,
    approvedSampleId: b.approvedSampleId,
    matchesPreviousLot: b.matchesPreviousLot || undefined,
    qty: Number(b.qty || 0),
    unit: b.unit || "m",
    stage: b.stage || "Dyeing",
    note: b.note,
  });
  return created(lot);
});
