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
import { createWorkOrder, deriveLoss, round } from "@/lib/production";
import { nextId } from "@/models/Counter";
import { hashPassword } from "@/lib/password";
import { DEMO_ACCOUNTS, DEFAULT_PASSWORD } from "@/lib/accounts";
import { WO_STATUSES } from "@/lib/domain";

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
  const [cottonYarn, polyYarn, reactiveDye, softener, viscoseYarn, linenYarn] =
    await Material.create([
      { code: "YRN-COT-30", name: "Cotton Yarn 30s", category: "Yarn", unit: "kg", stockQty: 5000, unitCost: 240 },
      { code: "YRN-POL-150", name: "Polyester Yarn 150D", category: "Yarn", unit: "kg", stockQty: 3000, unitCost: 180 },
      { code: "DYE-REA-BLU", name: "Reactive Dye Navy Blue", category: "Dye", unit: "kg", stockQty: 400, unitCost: 950 },
      { code: "CHM-SOFT", name: "Silicone Softener", category: "Chemical", unit: "kg", stockQty: 600, unitCost: 320 },
      { code: "YRN-VIS-40", name: "Viscose Yarn 40s", category: "Yarn", unit: "kg", stockQty: 2600, unitCost: 300 },
      { code: "YRN-LIN-25", name: "Linen Yarn 25s", category: "Yarn", unit: "kg", stockQty: 1800, unitCost: 520 },
    ]);

  // --- Vendors (job-work) ---
  const [dyeHouse, printHouse] = await Vendor.create([
    { code: "V-DYE-01", name: "ColourCraft Dye House", processes: ["Dyeing"], contact: "+91 90000 11111", avgTurnaroundDays: 4, avgLossPct: 3.2 },
    { code: "V-PRT-01", name: "PrimePrint Textiles", processes: ["Printing"], contact: "+91 90000 22222", avgTurnaroundDays: 6, avgLossPct: 4.1 },
  ]);

  // --- Machines (~30 across weaving/dyeing/finishing) ---
  const STATUS_CYCLE = ["Available", "Running", "Available", "Running", "Down", "Available", "Maintenance"] as const;
  const pickStatus = (i: number) => STATUS_CYCLE[i % STATUS_CYCLE.length];
  const machineSpecs: any[] = [];
  for (let i = 1; i <= 12; i++)
    machineSpecs.push({ code: `LOOM-${pad(i)}`, name: `Loom ${i}`, stage: "Weaving", capacityPerShift: 700 + ((i * 37) % 300), capacityUnit: "m", status: pickStatus(i) });
  for (let i = 1; i <= 4; i++)
    machineSpecs.push({ code: `KNIT-${pad(i)}`, name: `Knitting Machine ${i}`, stage: "Weaving", capacityPerShift: 900 + ((i * 50) % 200), capacityUnit: "m", status: pickStatus(i + 3) });
  for (let i = 1; i <= 6; i++)
    machineSpecs.push({ code: `DYE-JET-${pad(i)}`, name: `Dyeing Jet ${i}`, stage: "Dyeing", capacityPerShift: 1100 + ((i * 40) % 400), capacityUnit: "m", status: pickStatus(i + 1) });
  for (let i = 1; i <= 2; i++)
    machineSpecs.push({ code: `PRINT-${pad(i)}`, name: `Rotary Printer ${i}`, stage: "Dyeing", capacityPerShift: 1500, capacityUnit: "m", status: pickStatus(i) });
  for (let i = 1; i <= 4; i++)
    machineSpecs.push({ code: `STEN-${pad(i)}`, name: `Stenter ${i}`, stage: "Finishing", capacityPerShift: 1800 + ((i * 60) % 400), capacityUnit: "m", status: pickStatus(i + 2) });
  for (let i = 1; i <= 2; i++)
    machineSpecs.push({ code: `CAL-${pad(i)}`, name: `Calender ${i}`, stage: "Finishing", capacityPerShift: 1600, capacityUnit: "m", status: pickStatus(i) });
  // A couple of downtime notes for the Down/Maintenance units.
  for (const m of machineSpecs) {
    if (m.status === "Down") m.downtime = [{ from: daysFromNow(-1), reason: "Belt replacement" }];
    if (m.status === "Maintenance") m.downtime = [{ from: daysFromNow(0), reason: "Scheduled service" }];
  }
  const machines = await Machine.create(machineSpecs);
  const byCode = (c: string) => machines.find((m) => m.code === c)!;
  const weavingMachines = machines.filter((m) => m.stage === "Weaving");
  const dyeingMachines = machines.filter((m) => m.stage === "Dyeing");
  const finishingMachines = machines.filter((m) => m.stage === "Finishing");
  // Named picks reused by the detailed WOs below.
  const loom3 = byCode("LOOM-03");
  const loom5 = byCode("LOOM-05");
  const dyeJet = byCode("DYE-JET-01");
  const stenter = byCode("STEN-01");

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

  // --- More products (variety for the 50-WO board) ---
  const standardRouting = (dyeMode: "InHouse" | "JobWork" = "InHouse") => [
    { seq: 1, stage: "MaterialIssue", mode: "InHouse", inUnit: "kg", outUnit: "kg", stdLossPct: 0 },
    { seq: 2, stage: "Weaving", mode: "InHouse", inUnit: "kg", outUnit: "m", stdLossPct: 4 },
    { seq: 3, stage: "Dyeing", mode: dyeMode, inUnit: "m", outUnit: "m", stdLossPct: 3 },
    { seq: 4, stage: "Finishing", mode: "InHouse", inUnit: "m", outUnit: "m", stdLossPct: 2 },
    { seq: 5, stage: "Inspection", mode: "InHouse", inUnit: "m", outUnit: "m", stdLossPct: 1 },
    { seq: 6, stage: "Packing", mode: "InHouse", inUnit: "m", outUnit: "roll", stdLossPct: 0 },
  ];
  const extraDefs = [
    { sku: "FAB-COT-TWL-240", name: "Cotton Twill 240 GSM", gsm: 240, widthInch: 58, composition: "100% Cotton", construction: "3/1 Twill", finish: "Enzyme Wash", yarn: cottonYarn, qpu: 22, dyeMode: "InHouse" as const },
    { sku: "FAB-RAY-CHL-120", name: "Rayon Challis 120 GSM", gsm: 120, widthInch: 56, composition: "100% Viscose", construction: "Plain Weave", finish: "Soft", yarn: viscoseYarn, qpu: 13, dyeMode: "JobWork" as const },
    { sku: "FAB-CSP-JER-200", name: "Cotton-Spandex Jersey 200 GSM", gsm: 200, widthInch: 68, composition: "95% Cotton 5% Spandex", construction: "Single Jersey Knit", finish: "Bio-polish", yarn: cottonYarn, qpu: 21, dyeMode: "InHouse" as const },
    { sku: "FAB-LIN-PLN-180", name: "Linen Plain 180 GSM", gsm: 180, widthInch: 54, composition: "100% Linen", construction: "Plain Weave", finish: "Stone Wash", yarn: linenYarn, qpu: 20, dyeMode: "InHouse" as const },
    { sku: "FAB-POL-CHF-060", name: "Polyester Chiffon 60 GSM", gsm: 60, widthInch: 58, composition: "100% Polyester", construction: "Plain Weave", finish: "Heat Set", yarn: polyYarn, qpu: 7, dyeMode: "JobWork" as const },
    { sku: "FAB-VIS-SAT-150", name: "Viscose Satin 150 GSM", gsm: 150, widthInch: 60, composition: "100% Viscose", construction: "Satin Weave", finish: "Calendered", yarn: viscoseYarn, qpu: 16, dyeMode: "InHouse" as const },
    { sku: "FAB-COT-CNV-320", name: "Cotton Canvas 320 GSM", gsm: 320, widthInch: 60, composition: "100% Cotton", construction: "Plain Weave", finish: "Water Repellent", yarn: cottonYarn, qpu: 30, dyeMode: "InHouse" as const },
    { sku: "FAB-PCT-POP-120", name: "Poly-Cotton Poplin 120 GSM", gsm: 120, widthInch: 58, composition: "65% Poly 35% Cotton", construction: "Plain Weave", finish: "Soft", yarn: polyYarn, qpu: 12, dyeMode: "InHouse" as const },
  ];
  const extraProducts = await Promise.all(
    extraDefs.map((d) =>
      Product.create({
        sku: d.sku,
        name: d.name,
        gsm: d.gsm,
        widthInch: d.widthInch,
        composition: d.composition,
        construction: d.construction,
        baseColor: "Greige",
        finish: d.finish,
        baseUnit: "m",
        boms: [{ version: 1, lines: [{ material: d.yarn._id, qtyPerUnit: d.qpu, per: 100, unit: "kg" }] }],
        routing: standardRouting(d.dyeMode),
      })
    )
  );
  const products = [cottonPoplin, polyKnit, ...extraProducts];

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

  // ---------------------------------------------------------------------------
  // Bulk fill — 47 more WOs across all products and every lifecycle stage, so
  // the board, machine queues and reports look like a real plant (50 total).
  // ---------------------------------------------------------------------------
  const CUSTOMERS = [
    "Metro Garments Ltd", "Coastal Apparel", "Nova Textiles", "Zenith Exports",
    "Urban Threads", "Aarav Fabrics", "Blue Ridge Apparel", "Sunrise Mills",
    "Kanchan Weaves", "Orient Garments", "Silk Route Traders", "Peacock Prints",
  ];
  const PRIORITIES = ["Normal", "Normal", "Normal", "Flagged", "Rush"];
  const SHADE_PREFIX = ["NB", "TL", "RD", "GR", "BK", "MU", "OL", "MG"];
  const statusPlan: string[] = [
    ...Array(5).fill("Created"),
    ...Array(6).fill("Sampling"),
    ...Array(6).fill("PreProductionReview"),
    ...Array(12).fill("InProduction"),
    ...Array(7).fill("InInspection"),
    ...Array(6).fill("PackingDispatch"),
    ...Array(5).fill("Closed"),
  ]; // 47 total

  const bulkWoNos: string[] = [];
  for (let i = 0; i < statusPlan.length; i++) {
    const product = products[i % products.length];
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const qty = 500 + ((i * 137) % 7500);
    const due = daysFromNow(-8 + ((i * 3) % 38));
    const priority = PRIORITIES[i % PRIORITIES.length];
    const target = statusPlan[i];

    const wo = await createWorkOrder({
      productId: String(product._id),
      targetQty: qty,
      unit: "m",
      dueDate: String(due),
      priority,
      customerRef: customer,
      assignedName: planner.name,
    });

    const idx = WO_STATUSES.indexOf(target as any);
    const path = WO_STATUSES.slice(1, idx + 1) as unknown as string[];
    if (path.length) await advance(wo, path, planner.name);

    // Populate floor work up to the stage the status implies.
    if (idx >= 3) {
      const loom = weavingMachines[i % weavingMachines.length];
      const kgIn = Math.max(1, round(qty / 6.2, 0));
      const mWeave = round(qty * 0.97, 0);
      await stageEntry(wo, "Weaving", { qtyIn: kgIn, inUnit: "kg", qtyOut: mWeave, outUnit: "m", wastageQty: round(mWeave * 0.005, 0), machine: loom, operator: "Ramesh K", stdLossPct: 4, convOutPerIn: round(mWeave / kgIn, 2) });

      if (idx >= 4) {
        const jet = dyeingMachines[i % dyeingMachines.length];
        const mDye = round(mWeave * 0.98, 0);
        await stageEntry(wo, "Dyeing", { qtyIn: mWeave, inUnit: "m", qtyOut: mDye, outUnit: "m", wastageQty: round(mDye * 0.004, 0), machine: jet, operator: "Farah N", stdLossPct: 3 });

        const lot = await Lot.create({
          lotNo: await nextId("LOT"), workOrder: wo._id, woNo: wo.woNo,
          shadeCode: `${SHADE_PREFIX[i % SHADE_PREFIX.length]}-${1000 + i}`,
          qty: mDye, unit: "m", stage: "Dyeing",
        });

        const sten = finishingMachines[i % finishingMachines.length];
        const mFin = round(mDye * 0.99, 0);
        await stageEntry(wo, "Finishing", { qtyIn: mDye, inUnit: "m", qtyOut: mFin, outUnit: "m", wastageQty: round(mFin * 0.003, 0), machine: sten, operator: "Iqbal M", stdLossPct: 2 });

        await QcInspection.create({
          workOrder: wo._id, woNo: wo.woNo, lot: lot._id, lotNo: lot.lotNo,
          inspectedQty: mFin, unit: "m", grade: i % 5 === 0 ? "B" : "A", result: "Pass",
          rejectQty: round(mFin * 0.01, 0),
          defects: [{ reasonCode: "SHADE_VAR", qty: round(mFin * 0.005, 0) }],
          inspectorName: "Deepa S", responsibleStage: "Weaving", responsibleMachineName: loom.name,
        });

        if (idx >= 5) {
          await packRolls(wo, lot, splitRolls(mFin).map((len, j) => ({ lengthM: len, grade: j % 6 === 0 ? "B" : "A" })));
        }
      }
    }
    bulkWoNos.push(wo.woNo);
  }

  return {
    users: users.length,
    machines: machines.length,
    products: products.length,
    salesOrders: 3,
    workOrders: [wo1.woNo, wo2.woNo, wo3.woNo, ...bulkWoNos],
    workOrderCount: 3 + bulkWoNos.length,
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

/** Zero-pad to two digits for machine codes (LOOM-03). */
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Split a finished length into a handful of variable-length rolls (FR-PK-1). */
function splitRolls(total: number): number[] {
  const n = Math.max(1, Math.min(8, Math.round(total / 400)));
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, k) => base + (k % 2 ? 6 : -4));
}
