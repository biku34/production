import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";
import { STAGES, UNITS } from "@/lib/domain";

/** Material issue & actual consumption (FR-MI). */
const MaterialIssueSchema = new Schema(
  {
    workOrder: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    woNo: { type: String, required: true },
    stage: { type: String, enum: STAGES, default: "MaterialIssue" },
    material: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    materialName: { type: String },

    plannedQty: { type: Number, default: 0 }, // from BOM (FR-MI-2)
    qtyIssued: { type: Number, required: true },
    qtyReturned: { type: Number, default: 0 }, // FR-MI-3
    unit: { type: String, enum: UNITS, default: "kg" },

    issueSlipNo: { type: String },
    issuedByName: { type: String },
    at: { type: Date, default: Date.now },
    note: { type: String },
  },
  { timestamps: true }
);

export type MaterialIssueDoc = InferSchemaType<typeof MaterialIssueSchema>;

export default (models.MaterialIssue as mongoose.Model<MaterialIssueDoc>) ||
  model<MaterialIssueDoc>("MaterialIssue", MaterialIssueSchema);
