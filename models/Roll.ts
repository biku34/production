import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";
import { GRADES } from "@/lib/domain";

/** Finished roll — variable length; a "unit" is a roll, not a fixed qty (FR-PK-1). */
const RollSchema = new Schema(
  {
    rollNo: { type: String, required: true, unique: true },
    workOrder: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    woNo: { type: String, required: true },
    lot: { type: Schema.Types.ObjectId, ref: "Lot" },
    lotNo: { type: String },
    shadeCode: { type: String },

    lengthM: { type: Number, required: true },
    grade: { type: String, enum: GRADES, default: "A" },
    status: {
      type: String,
      enum: ["InStock", "Dispatched", "Hold"],
      default: "InStock",
    },
    labelPrinted: { type: Boolean, default: false }, // FR-PK-2
  },
  { timestamps: true }
);

export type RollDoc = InferSchemaType<typeof RollSchema>;

export default (models.Roll as mongoose.Model<RollDoc>) ||
  model<RollDoc>("Roll", RollSchema);
