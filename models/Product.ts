import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";
import { STAGES, UNITS } from "@/lib/domain";

/** BOM line — a material consumed per output unit (FR-BOM-1). */
const BomLineSchema = new Schema(
  {
    material: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    qtyPerUnit: { type: Number, required: true }, // e.g. kg yarn per 100 m
    per: { type: Number, default: 1 }, // "per N output units" (e.g. per 100)
    unit: { type: String, enum: UNITS, default: "kg" },
    note: { type: String },
  },
  { _id: false }
);

/** A versioned, effective-dated BOM (FR-BOM-3). */
const BomVersionSchema = new Schema(
  {
    version: { type: Number, required: true },
    effectiveFrom: { type: Date, default: Date.now },
    lines: [BomLineSchema],
  },
  { _id: false }
);

/** One stage in the process route (FR-RT-1,2). */
const RoutingStageSchema = new Schema(
  {
    seq: { type: Number, required: true },
    stage: { type: String, enum: STAGES, required: true },
    mode: { type: String, enum: ["InHouse", "JobWork"], default: "InHouse" },
    inUnit: { type: String, enum: UNITS, required: true },
    outUnit: { type: String, enum: UNITS, required: true },
    stdLossPct: { type: Number, default: 0 },
    optional: { type: Boolean, default: false }, // FR-RT-3 conditional stages
  },
  { _id: false }
);

/** Product / SKU master with specs, BOM versions and routing (SRS §5.1, §6). */
const ProductSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    // Fabric specs (FR-WO-1)
    gsm: { type: Number },
    widthInch: { type: Number },
    composition: { type: String }, // e.g. "100% Cotton"
    construction: { type: String }, // weave/knit, e.g. "Single Jersey"
    baseColor: { type: String },
    finish: { type: String },
    baseUnit: { type: String, enum: UNITS, default: "m" },

    boms: [BomVersionSchema],
    routing: [RoutingStageSchema],
  },
  { timestamps: true }
);

export type ProductDoc = InferSchemaType<typeof ProductSchema>;

export default (models.Product as mongoose.Model<ProductDoc>) ||
  model<ProductDoc>("Product", ProductSchema);
