import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";
import { GRADES } from "@/lib/domain";

const DefectSchema = new Schema(
  {
    reasonCode: { type: String, required: true }, // e.g. "HOLE", "SHADE_VAR"
    qty: { type: Number, default: 0 },
    note: { type: String },
  },
  { _id: false }
);

/** QC / inspection & grading (FR-QC), with defect log and wastage (FR-WR). */
const QcInspectionSchema = new Schema(
  {
    workOrder: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    woNo: { type: String, required: true },
    lot: { type: Schema.Types.ObjectId, ref: "Lot" },
    lotNo: { type: String },
    roll: { type: Schema.Types.ObjectId, ref: "Roll" },
    rollNo: { type: String },

    inspectedQty: { type: Number, required: true },
    unit: { type: String, default: "m" },
    grade: { type: String, enum: GRADES, default: "A" },
    result: { type: String, enum: ["Pass", "Reject", "Hold"], default: "Pass" },
    rejectQty: { type: Number, default: 0 }, // FR-WR-1

    defects: [DefectSchema],

    inspectorName: { type: String },
    // Link a reject back to responsible stage/machine/operator (FR-QC-4).
    responsibleStage: { type: String },
    responsibleMachineName: { type: String },
    at: { type: Date, default: Date.now },
    note: { type: String },
  },
  { timestamps: true }
);

export type QcInspectionDoc = InferSchemaType<typeof QcInspectionSchema>;

export default (models.QcInspection as mongoose.Model<QcInspectionDoc>) ||
  model<QcInspectionDoc>("QcInspection", QcInspectionSchema);
