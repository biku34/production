import { dbConnect } from "@/lib/mongoose";
import {
  User,
  Material,
  Vendor,
  Machine,
  Product,
  SalesOrder,
  WorkOrder,
  StageEntry,
  MaterialIssue,
  Lot,
  Roll,
  QcInspection,
  JobworkDispatch,
  Counter,
} from "@/models";
import { createWorkOrder, deriveLoss } from "@/lib/production";
import { nextId } from "@/models/Counter";
import { hashPassword } from "@/lib/password";
import { DEMO_ACCOUNTS, DEFAULT_PASSWORD } from "@/lib/accounts";

/**
 * Idempotent-ish demo seed. Wipes the module's collections and rebuilds a
 * realistic slice that exercises the whole SRS spine (§11): WO from order,
 * job board across statuses, stage entries with kg→m unit change + loss,
 * lot/shade, roll packing, QC grading, and a job-work dispatch/return cycle.
 */
export async function seedDatabase() {
  await dbConnect();

  await Promise.all([
    User.deleteMany({}),
    Material.deleteMany({}),
    Vendor.deleteMany({}),
    Machine.deleteMany({}),
    Product.deleteMany({}),
    SalesOrder.deleteMany({}),
    WorkOrder.deleteMany({}),
    StageEntry.deleteMany({}),
    MaterialIssue.deleteMany({}),
    Lot.deleteMany({}),
    Roll.deleteMany({}),
    QcInspection.deleteMany({}),
    JobworkDispatch.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  // --- Users (roles per SRS §2.3) — one login account each, hashed default
  //     password. Credentials live in lib/accounts.ts (shared with login UI). ---
  const passwordHash = hashPassword(DEFAULT_PASSWORD);
  const users = await User.create(
    DEMO_ACCOUNTS.map((a) => ({
      name: a.name,
      email: a.email,
      username: a.username,
      passwordHash,
      role: a.role,
      stages: a.stages ?? [],
    }))
  );
  const planner = users.find((u) => u.role === "ProductionPlanner")!;

  // --- Materials ---
  const [cottonYarn, polyYarn, reactiveDye, softener] = await Material.create([
    { code: "YRN-COT-30", name: "Cotton Yarn 30s", category: "Yarn", unit: "kg", stockQty: 5000, unitCost: 240 },
    { code: "YRN-POL-150", name: "Polyester Yarn 150D", category: "Yarn", unit: "kg", stockQty: 3000, unitCost: 180 },
    { code: "DYE-REA-BLU", name: "Reactive Dye Navy Blue", category: "Dye", unit: "kg", stockQty: 400, unitCost: 950 },
    { code: "CHM-SOFT", name: "Silicone Softener", category: "Chemical", unit: "kg", stockQty: 600, unitCost: 320 },
  ]);

  // --- Vendors (job-work) ---
  const [dyeHouse, printHouse] = await Vendor.create([
    { code: "V-DYE-01", name: "ColourCraft Dye House", processes: ["Dyeing"], contact: "+91 90000 11111", avgTurnaroundDays: 4, avgLossPct: 3.2 },
    { code: "V-PRT-01", name: "PrimePrint Textiles", processes: ["Printing"], contact: "+91 90000 22222", avgTurnaroundDays: 6, avgLossPct: 4.1 },
  ]);

  // --- Machines ---
  const [loom3, loom5, dyeJet, stenter] = await Machine.create([
    { code: "LOOM-03", name: "Loom 3", stage: "Weaving", capacityPerShift: 800, capacityUnit: "m", status: "Available" },
    { code: "LOOM-05", name: "Loom 5", stage: "Weaving", capacityPerShift: 750, capacityUnit: "m", status: "Running" },
    { code: "DYE-JET-1", name: "Dyeing Jet 1", stage: "Dyeing", capacityPerShift: 1200, capacityUnit: "m", status: "Available" },
    { code: "STEN-1", name: "Stenter 1", stage: "Finishing", capacityPerShift: 2000, capacityUnit: "m", status: "Available" },
  ]);

  // --- Products with BOM + routing ---
  const cottonPoplin = await Product.create({
    sku: "FAB-COT-POP-140",
    name: "Cotton Poplin 140 GSM",
    gsm: 140,
    widthInch: 58,
    composition: "100% Cotton",
    construction: "Plain Weave",
    baseColor: "Greige",
    finish: "Soft",
    baseUnit: "m",
    boms: [
      {
        version: 1,
        effectiveFrom: new Date("2026-01-01"),
        lines: [
          { material: cottonYarn._id, qtyPerUnit: 16, per: 100, unit: "kg", note: "16 kg / 100 m" },
          { material: reactiveDye._id, qtyPerUnit: 1.2, per: 100, unit: "kg" },
          { material: softener._id, qtyPerUnit: 0.5, per: 100, unit: "kg" },
        ],
      },
    ],
    routing: [
      { seq: 1, stage: "MaterialIssue", mode: "InHouse", inUnit: "kg", outUnit: "kg", stdLossPct: 0 },
      { seq: 2, stage: "Weaving", mode: "InHouse", inUnit: "kg", outUnit: "m", stdLossPct: 4 },
      { seq: 3, stage: "Dyeing", mode: "InHouse", inUnit: "m", outUnit: "m", stdLossPct: 3 },
      { seq: 4, stage: "Finishing", mode: "InHouse", inUnit: "m", outUnit: "m", stdLossPct: 2 },
      { seq: 5, stage: "Inspection", mode: "InHouse", inUnit: "m", outUnit: "m", stdLossPct: 1 },
      { seq: 6, stage: "Packing", mode: "InHouse", inUnit: "m", outUnit: "roll", stdLossPct: 0 },
    ],
  });

  const polyKnit = await Product.create({
    sku: "FAB-POL-JER-180",
    name: "Polyester Single Jersey 180 GSM",
    gsm: 180,
    widthInch: 66,
    composition: "100% Polyester",
    construction: "Single Jersey Knit",
    baseColor: "Greige",
    finish: "Anti-pill",
    baseUnit: "m",
    boms: [
      {
        version: 1,
        lines: [{ material: polyYarn._id, qtyPerUnit: 19, per: 100, unit: "kg" }],
      },
    ],
    routing: [
      { seq: 1, stage: "MaterialIssue", mode: "InHouse", inUnit: "kg", outUnit: "kg", stdLossPct: 0 },
      { seq: 2, stage: "Weaving", mode: "InHouse", inUnit: "kg", outUnit: "m", stdLossPct: 5 },
      { seq: 3, stage: "Dyeing", mode: "JobWork", inUnit: "m", outUnit: "m", stdLossPct: 3.5 },
      { seq: 4, stage: "Finishing", mode: "InHouse", inUnit: "m", outUnit: "m", stdLossPct: 2 },
      { seq: 5, stage: "Inspection", mode: "InHouse", inUnit: "m", outUnit: "m", stdLossPct: 1 },
      { seq: 6, stage: "Packing", mode: "InHouse", inUnit: "m", outUnit: "roll", stdLossPct: 0 },
    ],
  });

  // --- Sales orders ---
  const so1 = await SalesOrder.create({
    orderNo: await nextId("SO"),
    customer: "Metro Garments Ltd",
    product: cottonPoplin._id,
    qty: 5000,
    unit: "m",
    shade: "Navy NB-2231",
    dueDate: daysFromNow(-1), // overdue, to show the flag
    status: "Accepted",
  });
  const so2 = await SalesOrder.create({
    orderNo: await nextId("SO"),
    customer: "Coastal Apparel",
    product: polyKnit._id,
    qty: 3000,
    unit: "m",
    shade: "Teal TL-1180",
    dueDate: daysFromNow(1), // tomorrow
    status: "Accepted",
  });
  const so3 = await SalesOrder.create({
    orderNo: await nextId("SO"),
    customer: "Metro Garments Ltd",
    product: cottonPoplin._id,
    qty: 2000,
    unit: "m",
    shade: "Navy NB-2231 (match prev)",
    dueDate: daysFromNow(6),
    status: "Accepted",
  });

  // ---------------------------------------------------------------------------
  // WO #1 — fully driven through the spine to "Closed" (traceable roll demo).
  // ---------------------------------------------------------------------------
  const wo1 = await createWorkOrder({
    productId: String(cottonPoplin._id),
    targetQty: 5000,
    unit: "m",
    dueDate: String(daysFromNow(-1)),
    priority: "Rush",
    salesOrderId: String(so1._id),
    customerRef: so1.customer,
    assignedName: planner.name,
  });
  await SalesOrder.findByIdAndUpdate(so1._id, { status: "InProduction" });

  // Material issue (yarn kg)
  await issueMaterial(wo1, cottonYarn, 800, 800, "Sunita Devi");
  await issueMaterial(wo1, reactiveDye, 60, 60, "Sunita Devi");
  await issueMaterial(wo1, softener, 25, 25, "Sunita Devi");

  // Stage entries: Weaving (kg -> m), Dyeing, Finishing, Inspection
  await stageEntry(wo1, "Weaving", { qtyIn: 800, inUnit: "kg", qtyOut: 4820, outUnit: "m", wastageQty: 0, machine: loom3, operator: "Ramesh K", stdLossPct: 4, convOutPerIn: 6.25 });
  await stageEntry(wo1, "Dyeing", { qtyIn: 4820, inUnit: "m", qtyOut: 4700, outUnit: "m", wastageQty: 20, machine: dyeJet, operator: "Farah N", stdLossPct: 3 });
  await stageEntry(wo1, "Finishing", { qtyIn: 4700, inUnit: "m", qtyOut: 4640, outUnit: "m", wastageQty: 10, machine: stenter, operator: "Iqbal M", stdLossPct: 2 });

  // Lot + shade at dyeing
  const lot1 = await Lot.create({
    lotNo: await nextId("LOT"),
    workOrder: wo1._id,
    woNo: wo1.woNo,
    salesOrder: so1._id,
    shadeCode: "NB-2231",
    swatchRef: "swatch/navy-nb-2231.png",
    approvedSampleId: "LABDIP-0091",
    qty: 4700,
    unit: "m",
    stage: "Dyeing",
  });

  // Inspection + grading
  await QcInspection.create({
    workOrder: wo1._id, woNo: wo1.woNo, lot: lot1._id, lotNo: lot1.lotNo,
    inspectedQty: 4640, unit: "m", grade: "A", result: "Pass", rejectQty: 40,
    defects: [{ reasonCode: "SHADE_VAR", qty: 25, note: "Minor edge shade variation" }, { reasonCode: "SLUB", qty: 15 }],
    inspectorName: "Deepa S", responsibleStage: "Weaving", responsibleMachineName: "Loom 3",
  });

  // Packing — variable-length rolls
  await packRolls(wo1, lot1, [
    { lengthM: 120, grade: "A" }, { lengthM: 118, grade: "A" }, { lengthM: 125, grade: "A" },
    { lengthM: 100, grade: "A" }, { lengthM: 95, grade: "B" },
  ]);

  // Drive status to Closed with history + write-back to sales
  await advance(wo1, ["Sampling", "PreProductionReview", "InProduction", "InInspection", "PackingDispatch", "Closed"], planner.name);
  await SalesOrder.findByIdAndUpdate(so1._id, { status: "Delivered", wipStatus: "Closed", realizedDeliveryDate: new Date() });

  // ---------------------------------------------------------------------------
  // WO #2 — polyester knit, mid-flight, with a JOB-WORK dyeing dispatch/return.
  // ---------------------------------------------------------------------------
  const wo2 = await createWorkOrder({
    productId: String(polyKnit._id),
    targetQty: 3000,
    unit: "m",
    dueDate: String(daysFromNow(1)),
    priority: "Flagged",
    salesOrderId: String(so2._id),
    customerRef: so2.customer,
    assignedName: planner.name,
  });
  await SalesOrder.findByIdAndUpdate(so2._id, { status: "InProduction", wipStatus: "In Production" });

  await issueMaterial(wo2, polyYarn, 590, 590, "Sunita Devi");
  await stageEntry(wo2, "Weaving", { qtyIn: 590, inUnit: "kg", qtyOut: 2900, outUnit: "m", wastageQty: 15, machine: loom5, operator: "Ramesh K", stdLossPct: 5, convOutPerIn: 5.08 });

  const lot2 = await Lot.create({
    lotNo: await nextId("LOT"), workOrder: wo2._id, woNo: wo2.woNo, salesOrder: so2._id,
    shadeCode: "TL-1180", swatchRef: "swatch/teal-tl-1180.png", qty: 2900, unit: "m", stage: "Dyeing",
  });

  // Job-work dyeing dispatch (out at vendor) + partial return
  const jw = await JobworkDispatch.create({
    workOrder: wo2._id, woNo: wo2.woNo, stage: "Dyeing", vendor: dyeHouse._id, vendorName: dyeHouse.name,
    lot: lot2._id, lotNo: lot2.lotNo, qtySent: 2900, unit: "m",
    expectedReturn: daysFromNow(3), rate: 22, status: "OutAtVendor",
  });
  jw.returned = true; jw.qtyReturned = 2820; jw.shortageQty = 80; jw.quality = "Good";
  jw.actualCost = 2820 * 22; jw.returnedAt = new Date(); jw.status = "PartialReturn";
  await jw.save();
  await Material.findByIdAndUpdate(polyYarn._id, { $inc: { outAtVendorQty: 0 } });

  await advance(wo2, ["Sampling", "PreProductionReview", "InProduction"], planner.name);

  // ---------------------------------------------------------------------------
  // WO #3 — stock-ish repeat order, freshly created (sits at top of board).
  // ---------------------------------------------------------------------------
  const wo3 = await createWorkOrder({
    productId: String(cottonPoplin._id),
    targetQty: 2000,
    unit: "m",
    dueDate: String(daysFromNow(6)),
    priority: "Normal",
    salesOrderId: String(so3._id),
    customerRef: so3.customer,
    assignedName: planner.name,
  });
  await advance(wo3, ["Sampling"], planner.name);

  return {
    users: users.length,
    products: 2,
    salesOrders: 3,
    workOrders: [wo1.woNo, wo2.woNo, wo3.woNo],
  };

  // --- local helpers -------------------------------------------------------
  async function issueMaterial(wo: any, material: any, planned: number, issued: number, by: string) {
    await MaterialIssue.create({
      workOrder: wo._id, woNo: wo.woNo, stage: "MaterialIssue", material: material._id,
      materialName: material.name, plannedQty: planned, qtyIssued: issued,
      unit: material.unit, issueSlipNo: await nextId("ISS"), issuedByName: by,
    });
    await Material.findByIdAndUpdate(material._id, { $inc: { stockQty: -issued } });
  }

  async function stageEntry(
    wo: any,
    stage: string,
    o: { qtyIn: number; inUnit: any; qtyOut: number; outUnit: any; wastageQty: number; machine: any; operator: string; stdLossPct: number; convOutPerIn?: number }
  ) {
    const { lossQty, lossPct, lossFlagged } = deriveLoss({
      qtyIn: o.qtyIn, qtyOut: o.qtyOut, wastageQty: o.wastageQty,
      inUnit: o.inUnit, outUnit: o.outUnit, stdLossPct: o.stdLossPct,
      conversionOutPerIn: o.convOutPerIn,
    });
    await StageEntry.create({
      workOrder: wo._id, woNo: wo.woNo, stage,
      qtyIn: o.qtyIn, inUnit: o.inUnit, qtyOut: o.qtyOut, outUnit: o.outUnit,
      wastageQty: o.wastageQty, lossQty, lossPct, lossFlagged,
      machine: o.machine._id, machineName: o.machine.name,
      shift: "A", date: new Date(), operatorName: o.operator,
    });
  }

  async function packRolls(wo: any, lot: any, rolls: { lengthM: number; grade: string }[]) {
    for (const r of rolls) {
      await Roll.create({
        rollNo: await nextId("ROLL", 5), workOrder: wo._id, woNo: wo.woNo,
        lot: lot._id, lotNo: lot.lotNo, shadeCode: lot.shadeCode,
        lengthM: r.lengthM, grade: r.grade, status: "InStock", labelPrinted: true,
      });
    }
  }

  async function advance(wo: any, path: string[], by: string) {
    let from = wo.status;
    const doc = await WorkOrder.findById(wo._id);
    if (!doc) return;
    for (const to of path) {
      doc.status = to as any;
      doc.statusHistory.push({ from, to, byName: by, at: new Date() } as any);
      from = to;
    }
    await doc.save();
  }
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
