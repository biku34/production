import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";
import { STAGES, UNITS } from "@/lib/domain";

/** Job-work / outsourced processing dispatch & return (FR-JW). */
const JobworkDispatchSchema = new Schema(
  {
    workOrder: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true },
    woNo: { type: String, required: true },
    stage: { type: String, enum: STAGES, required: true },
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    vendorName: { type: String },
    lot: { type: Schema.Types.ObjectId, ref: "Lot" },
    lotNo: { type: String },

    qtySent: { type: Number, required: true },
    unit: { type: String, enum: UNITS, default: "m" },
    expectedReturn: { type: Date },
    rate: { type: Number, default: 0 }, // agreed cost/rate
    dispatchedAt: { type: Date, default: Date.now },

    // Return receipt (FR-JW-2)
    returned: { type: Boolean, default: false },
    qtyReturned: { type: Number, default: 0 },
    shortageQty: { type: Number, default: 0 },
    quality: { type: String },
    actualCost: { type: Number, default: 0 },
    returnedAt: { type: Date },

    status: {
      type: String,
      enum: ["OutAtVendor", "Returned", "PartialReturn"],
      default: "OutAtVendor",
    }, // FR-JW-3 distinct inventory state
    note: { type: String },
  },
  { timestamps: true }
);

export type JobworkDispatchDoc = InferSchemaType<typeof JobworkDispatchSchema>;

export default (models.JobworkDispatch as mongoose.Model<JobworkDispatchDoc>) ||
  model<JobworkDispatchDoc>("JobworkDispatch", JobworkDispatchSchema);
