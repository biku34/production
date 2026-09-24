import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";

/** External processor for job-work stages (SRS §5.1, FR-JW). */
const VendorSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    processes: [{ type: String }], // e.g. ["Dyeing", "Printing"]
    contact: { type: String },
    // Simple performance rollups (FR-JW-4).
    avgTurnaroundDays: { type: Number, default: 0 },
    avgLossPct: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type VendorDoc = InferSchemaType<typeof VendorSchema>;

export default (models.Vendor as mongoose.Model<VendorDoc>) ||
  model<VendorDoc>("Vendor", VendorSchema);
