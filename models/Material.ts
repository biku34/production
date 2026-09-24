import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";
import { UNITS } from "@/lib/domain";

/** Raw material master — yarn types, dyes, chemicals (SRS §5.1, §6). */
const MaterialSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ["Yarn", "Dye", "Chemical", "Packing", "Other"],
      default: "Yarn",
    },
    unit: { type: String, enum: UNITS, default: "kg" },
    // Lightweight stock view (real qty lives in the Inventory module — SRS §5.1).
    stockQty: { type: Number, default: 0 },
    reservedQty: { type: Number, default: 0 },
    outAtVendorQty: { type: Number, default: 0 }, // FR-JW-3
    unitCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type MaterialDoc = InferSchemaType<typeof MaterialSchema>;

export default (models.Material as mongoose.Model<MaterialDoc>) ||
  model<MaterialDoc>("Material", MaterialSchema);
