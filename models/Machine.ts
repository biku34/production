import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";
import { STAGES } from "@/lib/domain";

const DowntimeSchema = new Schema(
  {
    from: { type: Date, required: true },
    to: { type: Date },
    reason: { type: String },
  },
  { _id: false }
);

/** Loom / knitting / dyeing / finishing unit (SRS §4.7, §5.1). */
const MachineSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    stage: { type: String, enum: STAGES }, // which stage this machine serves
    capacityPerShift: { type: Number, default: 0 },
    capacityUnit: { type: String, default: "m" },
    status: {
      type: String,
      enum: ["Available", "Running", "Down", "Maintenance"],
      default: "Available",
    },
    downtime: [DowntimeSchema], // FR-SC-4
  },
  { timestamps: true }
);

export type MachineDoc = InferSchemaType<typeof MachineSchema>;

export default (models.Machine as mongoose.Model<MachineDoc>) ||
  model<MachineDoc>("Machine", MachineSchema);
