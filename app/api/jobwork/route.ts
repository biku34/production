import { dbConnect } from "@/lib/mongoose";
import { ok, created, fail, handle } from "@/lib/api";
import "@/models";
import JobworkDispatch from "@/models/JobworkDispatch";
import WorkOrder from "@/models/WorkOrder";
import Vendor from "@/models/Vendor";

export const dynamic = "force-dynamic";

// GET /api/jobwork?woId=&status=
export const GET = handle(async (req) => {
  await dbConnect();
  const url = new URL(req.url);
  const woId = url.searchParams.get("woId");
  const status = url.searchParams.get("status");
  const filter: Record<string, unknown> = {};
  if (woId) filter.workOrder = woId;
  if (status) filter.status = status;
  const rows = await JobworkDispatch.find(filter)
    .sort({ dispatchedAt: -1 })
    .lean();
  return ok(rows);
});

// POST /api/jobwork  { woId, stage, vendorId, qtySent, unit, expectedReturn, rate }
export const POST = handle(async (req) => {
  await dbConnect();
  const b = await req.json();
  const wo = await WorkOrder.findById(b.woId).lean<any>();
  if (!wo) return fail("Work order not found", 404);
  const vendor = await Vendor.findById(b.vendorId).lean<any>();
  if (!vendor) return fail("Vendor not found", 404);
  if (!b.qtySent || b.qtySent <= 0) return fail("qtySent must be > 0");

  const rec = await JobworkDispatch.create({
    workOrder: wo._id,
    woNo: wo.woNo,
    stage: b.stage,
    vendor: vendor._id,
    vendorName: vendor.name,
    lot: b.lotId || undefined,
    lotNo: b.lotNo,
    qtySent: Number(b.qtySent),
    unit: b.unit || "m",
    expectedReturn: b.expectedReturn ? new Date(b.expectedReturn) : undefined,
    rate: Number(b.rate || 0),
    status: "OutAtVendor", // material physically out at vendor (FR-JW-3)
    note: b.note,
  });
  return created(rec);
});
