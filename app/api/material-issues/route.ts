import { dbConnect } from "@/lib/mongoose";
import { ok, created, fail, handle } from "@/lib/api";
import "@/models";
import MaterialIssue from "@/models/MaterialIssue";
import WorkOrder from "@/models/WorkOrder";
import Material from "@/models/Material";
import { nextId } from "@/models/Counter";

export const dynamic = "force-dynamic";

// GET /api/material-issues?woId=
export const GET = handle(async (req) => {
  await dbConnect();
  const url = new URL(req.url);
  const woId = url.searchParams.get("woId");
  const filter: Record<string, unknown> = {};
  if (woId) filter.workOrder = woId;
  const issues = await MaterialIssue.find(filter).sort({ at: -1 }).lean();
  return ok(issues);
});

// POST /api/material-issues  { woId, materialId, qtyIssued, plannedQty, ... }
export const POST = handle(async (req) => {
  await dbConnect();
  const b = await req.json();
  const wo = await WorkOrder.findById(b.woId).lean<any>();
  if (!wo) return fail("Work order not found", 404);
  const material = await Material.findById(b.materialId).lean<any>();
  if (!material) return fail("Material not found", 404);
  if (!b.qtyIssued || b.qtyIssued <= 0) return fail("qtyIssued must be > 0");

  const issueSlipNo = await nextId("ISS");
  const issue = await MaterialIssue.create({
    workOrder: wo._id,
    woNo: wo.woNo,
    stage: b.stage || "MaterialIssue",
    material: material._id,
    materialName: material.name,
    plannedQty: b.plannedQty || 0,
    qtyIssued: Number(b.qtyIssued),
    unit: b.unit || material.unit || "kg",
    issueSlipNo,
    issuedByName: b.issuedByName,
    note: b.note,
  });

  // Reflect consumption on the lightweight stock view.
  await Material.findByIdAndUpdate(material._id, {
    $inc: { stockQty: -Number(b.qtyIssued) },
  });

  return created(issue);
});
