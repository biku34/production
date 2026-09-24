import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";
import { ROLES } from "@/lib/domain";
import { STAGES } from "@/lib/domain";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ROLES, required: true },
    // For a StageSupervisor: which stage(s) they own (drives role-scoped board).
    stages: [{ type: String, enum: STAGES }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export default (models.User as mongoose.Model<UserDoc>) ||
  model<UserDoc>("User", UserSchema);
