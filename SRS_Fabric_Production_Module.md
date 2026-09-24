# Software Requirements Specification (SRS)
## Fabric Plant — Production Module

| | |
|---|---|
| **Document title** | SRS — Production Module (Fabric Manufacturing Plant) |
| **Version** | 1.0 (Draft for client showcase) |
| **Date** | 2026-09-24 |
| **Prepared by** | SmartSeal |
| **Reference system** | Visual Graphx admin (OnPrintShop-based web-to-print platform) — used as the *sample production web app* for workflow, job-board, role and dispatch conventions |
| **Status** | Draft for review / demo |

---

## 0. How to read this document

This SRS specifies a **Production module** for a **fabric manufacturing plant**. It is written to serve two audiences at once:

1. **Engineering** — a buildable spec: scope, functional requirements, data model, interfaces, and acceptance criteria.
2. **The client (sales artifact)** — evidence that we understand both the reference platform they showed us (the Visual Graphx staging app) *and* the fabric-manufacturing domain, so this one module can win the larger multi-module project (CRM, Inventory, Accounts, etc.).

Where a requirement mirrors a pattern that already exists in the reference app, it is tagged **[Ref: Visual Graphx]** so the client can see the lineage.

> **Domain note.** The reference app (Visual Graphx) is a **print/signage** web-to-print system. Its production concepts — a **Job Board** with statuses *New Order → In Design → Order Review → In Production*, an **Order Shipment** step, **Workflow-Admin** roles, and prepress tools (**Imposition**, **Designer Studio**) — map cleanly onto fabric manufacturing. This document reuses that structure and re-expresses it for fabric stages (yarn → weaving/knitting → dyeing/printing → finishing → inspection → packing).

---

## 1. Introduction

### 1.1 Purpose
The Production module turns an accepted **sales order** (or a stock-build plan) into one or more **work orders (job cards)**, tracks each job as it moves through the plant's production stages, records material consumption and losses at every stage, captures quality/grading and wastage, supports outsourced (job-work) processes, and writes finished goods back to inventory with full **lot/shade** traceability. It is the shop-floor answer to three constant questions: **what needs to be made, where is it right now, and is it on schedule.**

### 1.2 Scope
**In scope**
- Work order / job card lifecycle (create → plan → produce → inspect → pack → close).
- Bill of Materials (BOM) and process routing per product.
- Stage-wise production entry with **quantity-in / quantity-out per stage** (loss capture).
- Material issue and actual-vs-planned consumption.
- Machine/line allocation and lightweight scheduling.
- Job-work (outsourced dyeing/printing/finishing) dispatch and return tracking.
- Lot / batch / shade tracking and traceability.
- QC / inspection, grading (A/B), rejection and wastage.
- Packing (roll-wise, variable length) and hand-off to dispatch/shipment.
- Production **Job Board** (kanban), WIP status, and production reports.

**Out of scope (this module; consumed via interfaces)**
- Customer relationship management / lead & quotation management.
- Financial accounting / invoicing / GST (consumes production cost data).
- Full warehouse management (production reads stock and writes finished goods via the Inventory interface).
- E-commerce storefront / online designer (the reference app's storefront side).

### 1.3 Definitions, acronyms & glossary
| Term | Meaning |
|---|---|
| **Work Order (WO) / Job Card** | The central production object generated from a sales order or stock plan; travels through the plant. |
| **BOM** | Bill of Materials — raw material (yarn, dyes, chemicals) consumed per unit of output. |
| **Routing / Process route** | Ordered sequence of stages a product passes through. |
| **Greige** | Unfinished, undyed woven/knitted fabric. |
| **Lot / Batch** | A production run grouping (esp. a dyeing run); shade varies slightly per lot. |
| **Shade** | The realized colour of a dye lot; buyers reorder "to match" a prior shade. |
| **GSM** | Grams per square metre — fabric weight, affects effective pricing. |
| **WIP** | Work in progress — jobs currently between stages. |
| **Job-work** | An outsourced process performed by an external vendor (e.g., dyeing). |
| **Marker / Lay** | Fabric-side analogue of print "imposition" — planning cut/lay layout. |
| **Job Board** | Kanban board of jobs grouped by production status/stage. **[Ref: Visual Graphx]** |
| **Workflow Admin** | A user who owns/monitors a slice of the job board. **[Ref: Visual Graphx]** |

### 1.4 References
- Reference application: Visual Graphx admin, `staging.visualgraphx.com/admin` (OnPrintShop-based). Screens observed: Dashboard (Job Board summary), List Orders, **Job Board – Grid View** (`job_board_order_grid.php`), Order Status, Order Shipment, Imposition (Beta), Designer Studio, Reports.
- Prior domain analysis (dependencies, inputs, outputs, stage-wise transform table) — Section 5 and Appendix A.

### 1.5 Document overview
Section 2 gives the overall description and users. Section 3 defines the production domain and lifecycle. Section 4 specifies functional requirements per sub-module. Section 5 details dependencies/inputs/outputs. Section 6 gives the data model. Sections 7–9 cover interfaces, non-functional requirements, and reports. Section 10 lists assumptions and open questions. Section 11 defines the demo/MVP scope and acceptance criteria.

---

## 2. Overall description

### 2.1 Product perspective
The Production module is one module of a planned multi-module plant system. It sits **between Sales/CRM and Inventory/Accounts**:

```
  Sales / CRM ──(sales order)──▶  PRODUCTION  ──(finished goods)──▶  Inventory
       ▲                              │  │                               │
       │                              │  └──(cost/consumption)──▶ Accounts
       └────(realistic ETAs, WIP status)                                 │
                                      └──────(reads raw stock)◀──────────┘
```

Two loops define its soundness:
- **Inventory loop** — reads raw stock (dependency) *and* writes finished rolls (destination).
- **Sales loop** — reads orders (demand) *and* writes back WIP status + realistic delivery dates.

### 2.2 Product functions (summary)
- Generate and manage work orders / job cards.
- Reserve and issue materials against BOM; track actual consumption.
- Track jobs stage-by-stage with quantity-in/out and loss.
- Allocate machines/lines and sequence jobs.
- Manage job-work dispatch/return with external vendors.
- Record lots/shades, QC grading, rejections, wastage.
- Pack finished goods (roll-wise) and hand off to shipment.
- Present a production **Job Board**, WIP dashboard, and reports.

### 2.3 User classes and characteristics (roles)
Modeled on the reference app's **Workflow Admin** pattern **[Ref: Visual Graphx]**, generalized to plant roles:

| Role | Primary responsibilities | Typical screens |
|---|---|---|
| **Production Planner / Manager** | Create WOs from orders, set routing, schedule machines, monitor whole board | Job Board, WO create/plan, scheduling, reports |
| **Store / Materials Keeper** | Issue yarn/dyes/chemicals, confirm reservations, receive finished goods | Material issue, stock view, GRN |
| **Stage Supervisor (Weaving / Dyeing / Finishing)** | Log stage production entries (qty in/out, machine, shift) | Stage entry, machine queue |
| **QC / Inspector** | Record inspection results, grade (A/B), log defects & rejects | QC entry, defect log |
| **Job-work Coordinator** | Dispatch to and receive from outsourcing vendors | Job-work dispatch/return |
| **Packing / Dispatch** | Pack rolls, print labels, hand off to shipment | Packing, Order Shipment |
| **Plant Owner / Admin** | Full visibility, masters, permissions, reports | All + Admin/masters |

Each role sees a **role-scoped Job Board** (a supervisor sees only their stage's queue), exactly as the reference app scopes the grid per Workflow Admin.

### 2.4 Operating environment
- Web application, responsive for shop-floor tablets/kiosks and desktop for planners.
- Server-side stack and DB per the wider project (assumed LAMP/OnPrintShop-compatible unless specified — see Open Questions).
- Optional barcode/QR scanning for WO, lot and roll IDs.

### 2.5 Design & implementation constraints
- **Match reference conventions** where sensible: kanban Job Board, per-user workflow scoping, order/status vocabulary, shipment step, list+filter+per-page grids. **[Ref: Visual Graphx]**
- Multi-store / multi-unit capable (reference app is multi-store).
- Units must be explicit and convertible (kg ↔ m ↔ yd ↔ pcs).

### 2.6 Assumptions and dependencies
See Section 5 (dependencies) and Section 10 (assumptions/open questions).

---

## 3. Production domain model & lifecycle

### 3.1 Fabric production flow (stages)
```
Yarn / raw material  ─▶  Weaving / Knitting  ─▶  Dyeing / Printing  ─▶  Finishing  ─▶  Inspection / QC  ─▶  Packing  ─▶  Dispatch
     (kg)                    (greige, m)             (dyed, m, lot+shade)   (finished, m)      (graded A/B, m)     (rolls)      (shipment)
```
Not every product uses every stage (routing decides). Some stages may be **in-house** or **job-work** (outsourced) per plant.

### 3.2 Work-order lifecycle (statuses) — mapped to the reference Job Board
| Reference status **[Ref: Visual Graphx]** | Fabric-plant WO status | Meaning |
|---|---|---|
| Watch list | **Flagged / Priority** | Manually watched (rush, at-risk, VIP customer) |
| New Order | **Created / Planned** | WO generated, BOM & routing attached, materials to be reserved |
| In Design | **Sampling / Design & Approval** | Lab-dip / shade approval / design (for printed or made-to-shade fabric) |
| Order Review | **Pre-production Review** | Material availability, routing & schedule confirmed; released to floor |
| In Production | **In Production** | Weaving/knitting → dyeing → finishing in progress (sub-stage tracked) |
| *(QC)* | **In Inspection** | Grading / defect capture |
| Order Shipment | **Packing & Dispatch** | Packed roll-wise, handed to shipment |
| — | **Closed** | Fully produced, inspected, packed, reconciled |

### 3.3 The central design rule — quantity per stage
Quantity and even the **unit** change at every stage (weaving loss, dyeing loss, QC rejects). The system must store **quantity-in and quantity-out per stage**, never a single quantity on the WO. This single decision separates a real textile production module from a toy one. See the transform table in Appendix A.

---

## 4. Functional requirements

Requirements use IDs `FR-<area>-<n>`, with priority **M** (must / MVP-demo), **S** (should), **C** (could).

### 4.1 Work Order / Job Card (`FR-WO`)
| ID | Priority | Requirement |
|---|---|---|
| FR-WO-1 | M | Create a WO from an accepted sales order, copying specs (GSM, width, composition, weave/knit, colour/shade, finish, quantity, due date). |
| FR-WO-2 | M | Create a WO manually for stock-build (no sales order). |
| FR-WO-3 | M | One sales order may spawn multiple WOs; one WO maps to exactly one product/spec. |
| FR-WO-4 | M | Auto-attach BOM and process routing from masters at WO creation; allow override with reason. |
| FR-WO-5 | M | WO carries: WO no., customer/order ref (or "stock"), product+specs, target qty & unit, routing, priority, due date, assigned planner. |
| FR-WO-6 | M | WO status follows the lifecycle in §3.2; every status change is timestamped and attributed. |
| FR-WO-7 | S | Printable / scannable job card (WO no. as barcode/QR) for the shop floor. |
| FR-WO-8 | S | Split / merge WOs (partial lots) while preserving traceability. |
| FR-WO-9 | C | WO templates for frequently repeated products. |

### 4.2 Bill of Materials (`FR-BOM`)
| ID | Priority | Requirement |
|---|---|---|
| FR-BOM-1 | M | Define BOM per product: raw materials (yarn types, dyes, chemicals) with quantity per output unit (e.g., kg yarn per 100 m). |
| FR-BOM-2 | M | On WO creation, compute total material requirement and request reservation from Inventory. |
| FR-BOM-3 | S | Versioned BOMs (effective-dated); WO records the BOM version used. |
| FR-BOM-4 | S | Support alternate/substitute materials with conversion factors. |

### 4.3 Process routing (`FR-RT`)
| ID | Priority | Requirement |
|---|---|---|
| FR-RT-1 | M | Define an ordered stage sequence per product; each stage flagged **in-house** or **job-work**. |
| FR-RT-2 | M | Each stage defines expected input unit, output unit, and standard loss %. |
| FR-RT-3 | S | Conditional stages (skip printing/finishing for some products). |

### 4.4 Production Job Board & WIP (`FR-JB`) **[Ref: Visual Graphx]**
| ID | Priority | Requirement |
|---|---|---|
| FR-JB-1 | M | Kanban board with columns per WO status/stage (§3.2); cards show WO no., product, qty, customer, due date, current stage. |
| FR-JB-2 | M | Delivery flags on cards: **Overdue / Delivery Today / Delivery Tomorrow** (mirrors reference dashboard). |
| FR-JB-3 | M | Role-scoped board: a supervisor sees only their stage's queue; planner/owner sees all (mirrors per-Workflow-Admin scoping). |
| FR-JB-4 | M | Drag/drop or action-driven status transition with validation (cannot skip a mandatory stage). |
| FR-JB-5 | S | Grid view + list view toggle; filters by customer, product, machine, due window, status. |
| FR-JB-6 | M | Live WIP status per WO ("where is it right now") available to Sales/CRM read-only. |

### 4.5 Material issue & consumption (`FR-MI`)
| ID | Priority | Requirement |
|---|---|---|
| FR-MI-1 | M | Issue materials from stores against a WO/stage; generate an issue slip. |
| FR-MI-2 | M | Record **actual** consumption per stage and compare to BOM-planned. |
| FR-MI-3 | S | Return unused material to stores (reverse issue). |
| FR-MI-4 | S | Block/warn issuing beyond reserved quantity without authorization. |

### 4.6 Stage / process production entry (`FR-SE`)
| ID | Priority | Requirement |
|---|---|---|
| FR-SE-1 | M | Log entry per stage per WO: **quantity in, quantity out, wastage/loss, machine/line, shift/date, operator**. |
| FR-SE-2 | M | System derives per-stage loss = qty in − qty out − good output, and flags loss beyond routing's standard %. |
| FR-SE-3 | M | Handle unit change per stage (e.g., kg in → m out) via explicit conversion. |
| FR-SE-4 | M | Support partial completion (a stage can be logged across multiple shifts/days). |
| FR-SE-5 | S | Daily output summary per machine/shift (production heartbeat). |

### 4.7 Machine / line allocation & scheduling (`FR-SC`)
| ID | Priority | Requirement |
|---|---|---|
| FR-SC-1 | M | Machine/line master with capacity; assign a WO stage to a machine. |
| FR-SC-2 | M | View queue/sequence per machine ("what's queued on Loom 3"). |
| FR-SC-3 | S | Capacity-aware scheduling suggestion & drag-to-resequence. |
| FR-SC-4 | S | Machine downtime / maintenance log affecting availability. |

### 4.8 Job-work / outsourced processing (`FR-JW`)
| ID | Priority | Requirement |
|---|---|---|
| FR-JW-1 | M | For a job-work stage, create an outbound dispatch: vendor, WO/lot, quantity sent, expected return date, agreed cost/rate. |
| FR-JW-2 | M | Record return receipt: quantity returned, shortage/loss, quality, actual cost. |
| FR-JW-3 | M | Track material physically **out at vendor** as a distinct inventory state. |
| FR-JW-4 | S | Vendor performance (turnaround, loss %, on-time) rollups. |

### 4.9 Lot / batch / shade tracking (`FR-LOT`)
| ID | Priority | Requirement |
|---|---|---|
| FR-LOT-1 | M | Every dyeing/printing run is a **lot** with a **shade** reference; link lot → WO → sales order. |
| FR-LOT-2 | M | Store shade attributes (reference code, swatch/image, approved-against sample). |
| FR-LOT-3 | M | Traceability: from a finished roll, trace back through lots, stages, materials, and vendors. |
| FR-LOT-4 | S | "Match previous shade" — surface prior lot/shade for a repeat customer/product. |

### 4.10 QC / inspection & grading (`FR-QC`)
| ID | Priority | Requirement |
|---|---|---|
| FR-QC-1 | M | Record inspection per WO/lot/roll: pass/reject, grade (A/B/…), inspected quantity. |
| FR-QC-2 | M | Log defects with reason codes and quantity affected. |
| FR-QC-3 | S | Grading rules/config; hold/quarantine a lot pending decision. |
| FR-QC-4 | S | Link QC rejects back to the responsible stage/machine/operator for analysis. |

### 4.11 Wastage & rejection (`FR-WR`)
| ID | Priority | Requirement |
|---|---|---|
| FR-WR-1 | M | Capture wastage per stage and QC rejection per WO/lot, with reason. |
| FR-WR-2 | S | Wastage vs standard-loss variance reporting (margins live here). |

### 4.12 Packing & finished goods (`FR-PK`)
| ID | Priority | Requirement |
|---|---|---|
| FR-PK-1 | M | Pack roll-wise with **variable length per roll** (a "unit" is a roll, not a fixed qty). |
| FR-PK-2 | M | Generate roll labels (roll no., lot/shade, length, grade) — barcode/QR. |
| FR-PK-3 | M | Write finished goods to Inventory as finished rolls tagged with lot/shade/grade. |
| FR-PK-4 | M | Produce a packing list per WO/order. |

### 4.13 Dispatch / shipment hand-off (`FR-SH`) **[Ref: Visual Graphx — Order Shipment]**
| ID | Priority | Requirement |
|---|---|---|
| FR-SH-1 | M | Mark WO/order ready for shipment; hand packing list + roll details to the Shipment/dispatch step. |
| FR-SH-2 | S | Capture transporter/e-way details (Indian context) if dispatch handled here. |
| FR-SH-3 | M | On dispatch, close the WO and write realized delivery date back to Sales/CRM. |

### 4.14 Prepress/design hand-off (`FR-DS`) **[Ref: Visual Graphx — Designer Studio / Imposition]**
| ID | Priority | Requirement |
|---|---|---|
| FR-DS-1 | S | For printed/made-to-design fabric, attach the approved design/artwork & lab-dip to the WO before "In Production" (mirrors *In Design → Order Review*). |
| FR-DS-2 | C | **Marker/lay planning** (fabric analogue of print **imposition**): plan layout/consumption before cutting. |

---

## 5. Dependencies, inputs & outputs

### 5.1 Dependencies (must exist for production to function)
| Dependency | Why needed |
|---|---|
| Sales order module (or manual order entry) | Source of demand; triggers WOs. |
| Product / SKU master | Specs the WO pulls (GSM, width, composition, weave/knit, colour, finish). |
| BOM master | Material required per product to reserve/consume. |
| Process/routing master | The stage sequence a WO follows. |
| Inventory / stores module | Reports raw stock (dependency) and receives finished goods (destination). |
| Machine / resource master | Looms/knitting/dyeing units with capacity for allocation. |
| Vendor master | External processors for job-work stages. |
| User / operator master | Accountability for entries and machine operation. |

### 5.2 Inputs
- Work order request (auto from sales order, or manual for stock).
- Product specs + BOM (pulled at WO creation).
- Material issue records (yarn/dyes/chemicals released against a WO).
- Daily production entries (qty per stage/machine/shift) — the live heartbeat.
- QC / inspection results (pass/reject, grade, defect reasons).
- Job-work dispatch & receipt records.
- Machine availability / downtime logs.

### 5.3 Outputs
- Work orders / job cards (printable/scannable, travel the plant).
- Material requirement & reservation (pushed to Inventory).
- **WIP status** per order/stage (the #1 thing sales/management look at).
- Finished goods written to Inventory (rolls, lot/shade/grade).
- Wastage & rejection data (feeds quality + costing).
- Lot / batch / shade records (traceability for complaints & reorders).
- Realistic delivery dates fed back to Sales/CRM.
- Consumption & process-cost data fed to Accounts/costing.
- Production reports (machine efficiency, output vs plan, delays, operator productivity).

---

## 6. Data model (logical)

Core entities and key attributes (not exhaustive DDL):

- **work_order** — `wo_no`, `sales_order_id?`, `product_id`, specs snapshot, `target_qty`, `unit`, `routing_id`, `bom_version`, `priority`, `due_date`, `status`, `assigned_user_id`, timestamps.
- **wo_status_history** — `wo_no`, `from_status`, `to_status`, `user_id`, `at`.
- **bom / bom_line** — `product_id`, `version`, `material_id`, `qty_per_unit`, `unit`.
- **routing / routing_stage** — `product_id`, `seq`, `stage`, `in_house|job_work`, `in_unit`, `out_unit`, `std_loss_pct`.
- **material_issue** — `wo_no`, `stage`, `material_id`, `qty_issued`, `unit`, `issued_by`, `at`; plus `qty_returned`.
- **stage_entry** — `wo_no`, `stage`, `machine_id`, `qty_in`, `qty_out`, `wastage_qty`, `shift`, `date`, `operator_id`.
- **machine** — `machine_id`, `type`, `capacity`, `status`; **machine_downtime**.
- **lot** — `lot_no`, `wo_no`, `shade_code`, `swatch_ref`, `approved_sample_id?`.
- **roll** — `roll_no`, `lot_no`, `length`, `grade`, `status` (in-stock/dispatched).
- **qc_inspection** — `wo_no|lot_no|roll_no`, `inspected_qty`, `grade`, `pass_reject`; **qc_defect** (`reason_code`, `qty`).
- **jobwork_dispatch** — `wo_no`, `stage`, `vendor_id`, `qty_sent`, `expected_return`, `rate`; **jobwork_return** (`qty_returned`, `shortage`, `actual_cost`).
- **vendor**, **product**, **material**, **user/role**.

Key relationships: `sales_order 1—* work_order`; `work_order 1—* stage_entry`; `work_order 1—* lot`; `lot 1—* roll`; `work_order *—* material` (via BOM & issues); `routing_stage` drives allowed `stage_entry` sequence.

---

## 7. External interface requirements

### 7.1 User interfaces
- **Job Board** (kanban + list toggle, filters, per-page paging) — consistent with reference app grids. **[Ref: Visual Graphx]**
- **WO create/plan**, **Stage entry** (tablet-friendly), **Material issue**, **QC entry**, **Job-work dispatch/return**, **Packing**, **Dashboard**.
- Barcode/QR scanning on WO, lot, roll IDs.

### 7.2 Software interfaces
| Interface | Direction | Data |
|---|---|---|
| Sales/CRM | in / out | Reads sales orders & specs; writes WIP status + realistic ETAs. |
| Inventory | in / out | Reads raw stock & reservations; writes finished rolls & consumption. |
| Accounts/Costing | out | Actual material + machine/job-work cost per WO. |
| Vendor (job-work) | out / in | Dispatch & return records (optionally vendor portal later). |

### 7.3 Hardware/peripheral interfaces
- Barcode/QR scanners; label printers (roll labels, job cards); shop-floor tablets/kiosks.

---

## 8. Non-functional requirements
| Category | Requirement |
|---|---|
| **Performance** | Job Board loads < 2 s for typical volumes; stage entry saves < 1 s. |
| **Reliability / data integrity** | Quantity-in/out per stage must reconcile; no orphan lots/rolls; status transitions validated. |
| **Availability** | Suitable for shop-floor use across shifts; graceful handling of intermittent connectivity (queue entries). |
| **Security / access** | Role-based access (Section 2.3); every entry attributed and timestamped; audit trail on WO status & consumption. |
| **Usability** | Minimal-typing shop-floor forms; scan-first; large touch targets. |
| **Scalability / multi-unit** | Multi-store/multi-plant capable (reference app is multi-store). |
| **Auditability** | Full traceability roll → lot → stage → material → vendor. |
| **Localization** | Units (kg/m/yd/pcs), and Indian context (GST/HSN/e-way) where dispatch is in-module. |
| **Maintainability** | Masters (routing, BOM, machines, reason codes) configurable without code changes. |

---

## 9. Reports & dashboards
- **WIP / Job Board summary** by status/stage (order-wise) — mirrors reference dashboard's "Job Board – Summary [Order Wise]".
- **Output vs plan** per machine/day/shift.
- **Wastage & rejection** per stage/reason; variance vs standard loss.
- **Machine efficiency & downtime**; operator productivity.
- **Job-work register** (out/return, turnaround, loss, cost).
- **Lot/shade traceability** report.
- **Consumption & production cost** per WO (to Accounts).
- **Delivery performance** (overdue / on-time), feeding realistic ETAs to Sales.

---

## 10. Assumptions, constraints & open questions

### 10.1 Assumptions
- The reference Visual Graphx app is a **convention/UX baseline**, not the literal codebase; the fabric plant is the actual target domain.
- A Sales/CRM order source and an Inventory module exist or will be stubbed for the demo.
- Fabric "unit" is variable-length rolls; conversions between kg and m are explicit.

### 10.2 Constraints
- Reuse reference conventions (Job Board, statuses, Workflow-Admin scoping, Shipment) for client familiarity.
- Multi-unit, multi-store readiness.

### 10.3 Open questions (to confirm with the plant/client)
1. **In-house vs job-work** — which stages (weaving/knitting, dyeing, printing, finishing) are done in-house vs outsourced? This decides internal-entry vs dispatch/return handling per stage.
2. **Coupling** — does Production read **live** from the sales-order table or take a **copy** at WO creation?
3. **Process type** — does the plant weave, knit, dye, print, or trade? Changes stage priorities.
4. **Tech stack** — is the delivered module expected to sit inside the OnPrintShop/PHP stack, or a standalone app integrated via API?
5. **Manual-ness today** — will supervisors type entries into screens, or is a lighter/scan-first capture required?
6. **Dispatch ownership** — is shipment/e-way handled inside Production or by a separate Dispatch/Accounts module?

---

## 11. Demo / MVP scope & acceptance criteria

### 11.1 MVP (showcase) scope
To win the larger project, the demo should prove the **spine**:
1. Create a WO from an order with specs + BOM + routing. *(FR-WO-1,4; FR-BOM-1,2; FR-RT-1)*
2. **Job Board** with the fabric statuses and delivery flags, role-scoped. *(FR-JB-1,2,3,4)*
3. **Stage entry** capturing qty-in/out and loss across ≥3 stages with a unit change (kg→m). *(FR-SE-1,2,3)*
4. **Lot/shade** creation at dyeing + roll-wise packing + finished goods to inventory. *(FR-LOT-1; FR-PK-1,3)*
5. **QC grading** + wastage capture. *(FR-QC-1,2; FR-WR-1)*
6. **WIP status** visible + realistic ETA back to sales. *(FR-JB-6; FR-SH-3)*
7. One **job-work** dispatch/return cycle (if the plant outsources a stage). *(FR-JW-1,2)*

### 11.2 Acceptance criteria (samples)
- **AC-1** Creating a WO from a sales order copies all specs and auto-attaches BOM+routing; changing the order does not silently alter a released WO.
- **AC-2** The Job Board shows each WO in exactly one status column with correct Overdue/Today/Tomorrow flag, and a supervisor sees only their stage.
- **AC-3** A stage entry with qty-in 100 kg and qty-out 95 m records loss and, if beyond standard %, flags it; the unit change is explicit and reversible in trace.
- **AC-4** A finished roll can be traced back to its lot, shade, stages, materials, and any job-work vendor.
- **AC-5** Packing produces variable-length rolls with labels and writes finished goods to Inventory tagged with lot/shade/grade.
- **AC-6** On dispatch, the WO closes and a realized delivery date is available to Sales/CRM.

---

## Appendix A — Stage-by-stage input → output (the fabric-specific core)

| Stage | Input | Output | Watch for |
|---|---|---|---|
| Material issue | Yarn (kg), dyes/chemicals | Reserved stock, issue slip | Actual vs BOM planned |
| Weaving / knitting | Yarn (kg) | Greige fabric (m), on a loom/lot | Weaving loss; kg→m conversion |
| Dyeing / printing | Greige (m) + dyes | Dyed fabric (m), **dye lot + shade** | Shade variation per lot; process loss |
| Finishing | Dyed fabric (m) | Finished fabric (m) | Width/GSM shift after finishing |
| Inspection / QC | Finished fabric (m) | Graded fabric (A/B), reject qty | Defect logging, grading rules |
| Packing | Graded fabric | Packed rolls, labels, roll-wise qty | Roll = variable length, not fixed |

**Design consequence:** store **quantity-in and quantity-out per stage**, never one quantity on the WO.

---

## Appendix B — Reference-app mapping (Visual Graphx → Fabric Production)

| Visual Graphx (print) | Fabric Production (this module) |
|---|---|
| Job Board – Grid View (per Workflow Admin) | Production Job Board (per stage supervisor / planner) |
| Statuses: New Order → In Design → Order Review → In Production | Created → Sampling/Approval → Pre-production Review → In Production → Inspection |
| Order Shipment | Packing & Dispatch hand-off |
| Designer Studio | Design/artwork & lab-dip attachment (printed/made-to-shade fabric) |
| Imposition (Beta) | Marker / lay planning |
| Watch list + Overdue/Today/Tomorrow flags | Priority flag + same delivery flags |
| List Orders (filter, sort, per-page) | List Work Orders (same grid conventions) |

---

*End of SRS v1.0 (draft for review).*
