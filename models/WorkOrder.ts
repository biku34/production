import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";
import {
  WO_STATUSES,
  PRIORITIES,
  STAGES,
  UNITS,
} from "@/lib/domain";

/** Timestamped, attributed status change (FR-WO-6, §6 wo_status_history). */
const StatusHistorySchema = new Schema(
  {
    from: { type: String },
    to: { type: String, required: true },
    byName: { type: String },
    byRole: { type: String },
    at: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false }
);

/** Specs snapshot copied at WO creation so order edits don't mutate a WO (AC-1). */
const SpecsSchema = new Schema(
  {
    gsm: Number,
    widthInch: Number,
    composition: String,
    construction: String,
    color: String,
    finish: String,
  },
  { _id: false }
);

/** Routing snapshot (FR-WO-4 — attached at creation, overridable). */
const RoutingStageSnapSchema = new Schema(
  {
    seq: { type: Number, required: true },
    stage: { type: String, enum: STAGES, required: true },
    mode: { type: String, enum: ["InHouse", "JobWork"], default: "InHouse" },
    inUnit: { type: String, enum: UNITS },
    outUnit: { type: String, enum: UNITS },
    stdLossPct: { type: Number, default: 0 },
    optional: { type: Boolean, default: false },
  },
  { _id: false }
);

const WorkOrderSchema = new Schema(
  {
    woNo: { type: String, required: true, unique: true },
    salesOrder: { type: Schema.Types.ObjectId, ref: "SalesOrder" }, // null = stock build
    customerRef: { type: String, default: "Stock" },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String },
    sku: { type: String },
    specs: SpecsSchema,

    targetQty: { type: Number, required: true },
    unit: { type: String, enum: UNITS, default: "m" },

    bomVersion: { type: Number },
    routing: [RoutingStageSnapSchema],

    priority: { type: String, enum: PRIORITIES, default: "Normal" },
    dueDate: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedName: { type: String },

    status: { type: String, enum: WO_STATUSES, default: "Created" },
    statusHistory: [StatusHistorySchema],
    // The production stage the WO is currently at (latest stage entry). Drives
    // stage-specific scoping for supervisors (weaving vs dyeing vs finishing).
    currentStage: { type: String, enum: STAGES },

    overrideReason: { type: String }, // if routing/BOM overridden (FR-WO-4)
    notes: { type: String },
  },
  { timestamps: true }
);

export type WorkOrderDoc = InferSchemaType<typeof WorkOrderSchema>;

export default (models.WorkOrder as mongoose.Model<WorkOrderDoc>) ||
  model<WorkOrderDoc>("WorkOrder", WorkOrderSchema);
