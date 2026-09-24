import { dbConnect } from "@/lib/mongoose";
import { ok, created, fail, handle } from "@/lib/api";
import "@/models"; // register all schemas
import WorkOrder from "@/models/WorkOrder";
import SalesOrder from "@/models/SalesOrder";
import { createWorkOrder } from "@/lib/production";
import { STAGE_TO_STATUS, type Stage } from "@/lib/domain";

export const dynamic = "force-dynamic";

// GET /api/work-orders?status=&stage=&customer=&q=
export const GET = handle(async (req) => {
  await dbConnect();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const stage = url.searchParams.get("stage") as Stage | null;
  const customer = url.searchParams.get("customer");
  const q = url.searchParams.get("q");

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  // Role-scoped board: a stage supervisor sees only WOs in their stage's status.
  if (stage && STAGE_TO_STATUS[stage]) filter.status = STAGE_TO_STATUS[stage];
  if (customer) filter.customerRef = new RegExp(customer, "i");
  if (q)
    filter.$or = [
      { woNo: new RegExp(q, "i") },
      { productName: new RegExp(q, "i") },
      { customerRef: new RegExp(q, "i") },
    ];

  const wos = await WorkOrder.find(filter).sort({ createdAt: -1 }).lean();
  return ok(wos);
});

// POST /api/work-orders  { productId, targetQty, ... } | { salesOrderId }
export const POST = handle(async (req) => {
  await dbConnect();
  const body = await req.json();

  // Create from an accepted sales order (copies specs — AC-1).
  if (body.salesOrderId && !body.productId) {
    const so = await SalesOrder.findById(body.salesOrderId).lean<any>();
    if (!so) return fail("Sales order not found", 404);
    const wo = await createWorkOrder({
      productId: String(so.product),
      targetQty: body.targetQty ?? so.qty,
      unit: body.unit ?? so.unit,
      dueDate: body.dueDate ?? so.dueDate,
      priority: body.priority,
      salesOrderId: String(so._id),
      customerRef: so.customer,
      assignedName: body.assignedName,
    });
    await SalesOrder.findByIdAndUpdate(so._id, {
      status: "InProduction",
      wipStatus: "Created",
    });
    return created(wo);
  }

  if (!body.productId) return fail("productId or salesOrderId is required");
  if (!body.targetQty || body.targetQty <= 0)
    return fail("targetQty must be > 0");

  const wo = await createWorkOrder({
    productId: body.productId,
    targetQty: body.targetQty,
    unit: body.unit,
    dueDate: body.dueDate,
    priority: body.priority,
    salesOrderId: body.salesOrderId ?? null,
    customerRef: body.customerRef,
    assignedName: body.assignedName,
    overrideReason: body.overrideReason,
  });
  return created(wo);
});
