import { dbConnect } from "@/lib/mongoose";
import { ok, created, fail, handle } from "@/lib/api";
import "@/models";
import Roll from "@/models/Roll";
import Lot from "@/models/Lot";
import WorkOrder from "@/models/WorkOrder";
import { nextId } from "@/models/Counter";

export const dynamic = "force-dynamic";

// GET /api/rolls?woId=&lotId=
export const GET = handle(async (req) => {
  await dbConnect();
  const url = new URL(req.url);
  const woId = url.searchParams.get("woId");
  const lotId = url.searchParams.get("lotId");
  const filter: Record<string, unknown> = {};
  if (woId) filter.workOrder = woId;
  if (lotId) filter.lot = lotId;
  const rolls = await Roll.find(filter).sort({ createdAt: -1 }).lean();
  return ok(rolls);
});

// POST /api/rolls  { woId, lotId?, lengthM, grade }  — packing (FR-PK-1,2,3)
// Accepts one roll, or { rolls: [ {lengthM, grade}, ... ] } for batch packing.
export const POST = handle(async (req) => {
  await dbConnect();
  const b = await req.json();
  const wo = await WorkOrder.findById(b.woId).lean<any>();
  if (!wo) return fail("Work order not found", 404);

  let lot: any = null;
  if (b.lotId) lot = await Lot.findById(b.lotId).lean<any>();

  const specs: { lengthM: number; grade?: string }[] = b.rolls?.length
    ? b.rolls
    : [{ lengthM: b.lengthM, grade: b.grade }];

  const out = [];
  for (const s of specs) {
    if (!s.lengthM || s.lengthM <= 0) continue;
    const rollNo = await nextId("ROLL", 5);
    const roll = await Roll.create({
      rollNo,
      workOrder: wo._id,
      woNo: wo.woNo,
      lot: lot?._id,
      lotNo: lot?.lotNo,
      shadeCode: lot?.shadeCode,
      lengthM: Number(s.lengthM),
      grade: s.grade || "A",
      status: "InStock", // written to Inventory as finished goods (FR-PK-3)
      labelPrinted: true,
    });
    out.push(roll);
  }
  if (!out.length) return fail("No valid rolls to pack (lengthM required)");
  return created(out);
});
