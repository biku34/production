import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";

/** Dye/print lot with shade reference (FR-LOT). */
const LotSchema = new Schema(
  {
    lotNo: { type: String, required: true, unique: true },
    workOrder: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    woNo: { type: String, required: true },
    salesOrder: { type: Schema.Types.ObjectId, ref: "SalesOrder" },

    shadeCode: { type: String, required: true },
    swatchRef: { type: String }, // image/URL placeholder
    approvedSampleId: { type: String },
    matchesPreviousLot: { type: Schema.Types.ObjectId, ref: "Lot" }, // FR-LOT-4

    qty: { type: Number, default: 0 },
    unit: { type: String, default: "m" },
    stage: { type: String, default: "Dyeing" },
    note: { type: String },
  },
  { timestamps: true }
);

export type LotDoc = InferSchemaType<typeof LotSchema>;

export default (models.Lot as mongoose.Model<LotDoc>) ||
  model<LotDoc>("Lot", LotSchema);
