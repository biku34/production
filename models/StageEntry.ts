import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";
import { STAGES, UNITS } from "@/lib/domain";

/**
 * Stage / process production entry (FR-SE). The heart of the module:
 * quantity-in and quantity-out per stage, never one qty on the WO (SRS §3.3).
 */
const StageEntrySchema = new Schema(
  {
    workOrder: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    woNo: { type: String, required: true },
    stage: { type: String, enum: STAGES, required: true },

    qtyIn: { type: Number, required: true },
    inUnit: { type: String, enum: UNITS, required: true },
    qtyOut: { type: Number, required: true }, // good output
    outUnit: { type: String, enum: UNITS, required: true },
    wastageQty: { type: Number, default: 0 },

    // Derived at save: loss = qtyIn - qtyOut - wastage (in outUnit terms is not
    // meaningful across unit change, so we store both a raw and a pct against std).
    lossQty: { type: Number, default: 0 },
    lossPct: { type: Number, default: 0 },
    lossFlagged: { type: Boolean, default: false }, // beyond routing std % (FR-SE-2)

    machine: { type: Schema.Types.ObjectId, ref: "Machine" },
    machineName: { type: String },
    shift: { type: String, enum: ["A", "B", "C", "General"], default: "General" },
    date: { type: Date, default: Date.now },
    operatorName: { type: String },
    partial: { type: Boolean, default: false }, // FR-SE-4
    note: { type: String },
  },
  { timestamps: true }
);

export type StageEntryDoc = InferSchemaType<typeof StageEntrySchema>;

export default (models.StageEntry as mongoose.Model<StageEntryDoc>) ||
  model<StageEntryDoc>("StageEntry", StageEntrySchema);
