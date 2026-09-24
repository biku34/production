import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";

/**
 * Minimal Sales order stub (SRS §5.1, §10.1 — "will be stubbed for the demo").
 * Production reads a COPY of specs at WO creation (§10.3 Q2 / AC-1); we snapshot
 * onto the WorkOrder so changing the order does not silently alter a released WO.
 */
const SalesOrderSchema = new Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    customer: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    qty: { type: Number, required: true },
    unit: { type: String, default: "m" },
    shade: { type: String }, // requested shade / "match previous"
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ["Accepted", "InProduction", "Delivered", "Cancelled"],
      default: "Accepted",
    },
    // Written back by Production (FR-JB-6, FR-SH-3).
    wipStatus: { type: String },
    realizedDeliveryDate: { type: Date },
  },
  { timestamps: true }
);

export type SalesOrderDoc = InferSchemaType<typeof SalesOrderSchema>;

export default (models.SalesOrder as mongoose.Model<SalesOrderDoc>) ||
  model<SalesOrderDoc>("SalesOrder", SalesOrderSchema);
