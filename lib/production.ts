import { Types } from "mongoose";
import { nextId } from "@/models/Counter";
import Product from "@/models/Product";
import WorkOrder from "@/models/WorkOrder";
import type { Stage, Unit } from "@/lib/domain";

/** Pick the latest effective BOM version for a product. */
export function latestBom(product: any) {
  if (!product?.boms?.length) return null;
  return [...product.boms].sort(
    (a: any, b: any) => (b.version ?? 0) - (a.version ?? 0)
  )[0];
}

interface CreateWoInput {
  productId: string;
  targetQty: number;
  unit?: Unit;
  dueDate?: string | Date;
  priority?: string;
  salesOrderId?: string | null;
  customerRef?: string;
  assignedName?: string;
  overrideReason?: string;
}

/**
 * Create a WO from an accepted sales order or as a stock build (FR-WO-1,2,4).
 * Snapshots specs + routing + BOM version so later order/master edits don't
 * silently mutate a released WO (AC-1).
 */
export async function createWorkOrder(input: CreateWoInput) {
  const product = await Product.findById(input.productId).lean<any>();
  if (!product) throw new Error("Product not found");

  const bom = latestBom(product);
  const woNo = await nextId("WO");

  const routing = (product.routing || [])
    .slice()
    .sort((a: any, b: any) => a.seq - b.seq)
    .map((r: any) => ({
      seq: r.seq,
      stage: r.stage,
      mode: r.mode,
      inUnit: r.inUnit,
      outUnit: r.outUnit,
      stdLossPct: r.stdLossPct,
      optional: r.optional,
    }));

  const wo = await WorkOrder.create({
    woNo,
    salesOrder: input.salesOrderId
      ? new Types.ObjectId(input.salesOrderId)
      : undefined,
    customerRef: input.customerRef || (input.salesOrderId ? undefined : "Stock"),
    product: product._id,
    productName: product.name,
    sku: product.sku,
    specs: {
      gsm: product.gsm,
      widthInch: product.widthInch,
      composition: product.composition,
      construction: product.construction,
      color: product.baseColor,
      finish: product.finish,
    },
    targetQty: input.targetQty,
    unit: input.unit || product.baseUnit || "m",
    bomVersion: bom?.version,
    routing,
    priority: input.priority || "Normal",
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    assignedName: input.assignedName,
    overrideReason: input.overrideReason,
    status: "Created",
    statusHistory: [
      { from: null, to: "Created", byName: input.assignedName || "System", at: new Date() },
    ],
  });

  return wo;
}

/**
 * Derive per-stage loss (FR-SE-2). Because the unit can change across a stage
 * (kg in → m out, SRS §3.3), a raw subtraction is only meaningful in "input
 * terms". We express loss as a percentage of qtyIn that did not become good
 * output, using the stage's conversion implied by qtyOut, and flag it when it
 * exceeds the routing's standard loss %.
 */
export function deriveLoss(opts: {
  qtyIn: number;
  qtyOut: number;
  wastageQty: number;
  inUnit: Unit;
  outUnit: Unit;
  stdLossPct: number;
  /** expected output per input unit, when units differ (e.g. 2.5 m per kg). */
  conversionOutPerIn?: number;
}) {
  const { qtyIn, qtyOut, wastageQty, inUnit, outUnit, stdLossPct } = opts;
  let lossQty: number;
  let lossPct: number;

  if (inUnit === outUnit) {
    lossQty = Math.max(0, qtyIn - qtyOut - (wastageQty || 0));
    lossPct = qtyIn > 0 ? (lossQty / qtyIn) * 100 : 0;
  } else {
    // Units differ: compare expected output vs actual good output.
    const conv = opts.conversionOutPerIn && opts.conversionOutPerIn > 0
      ? opts.conversionOutPerIn
      : qtyIn > 0
      ? (qtyOut + (wastageQty || 0)) / qtyIn // fall back to implied
      : 0;
    const expectedOut = qtyIn * conv;
    const missingOut = Math.max(0, expectedOut - qtyOut);
    lossQty = missingOut; // in outUnit terms
    lossPct = expectedOut > 0 ? (missingOut / expectedOut) * 100 : 0;
  }

  const lossFlagged = lossPct > (stdLossPct ?? 0) + 0.0001;
  return {
    lossQty: round(lossQty, 3),
    lossPct: round(lossPct, 2),
    lossFlagged,
  };
}

export function round(n: number, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
}
