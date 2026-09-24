import mongoose, { Schema, InferSchemaType, models, model } from "mongoose";

const CounterSchema = new Schema({
  _id: { type: String, required: true }, // e.g. "WO", "LOT", "ROLL"
  seq: { type: Number, default: 0 },
});

export type CounterDoc = InferSchemaType<typeof CounterSchema>;

const Counter =
  (models.Counter as mongoose.Model<CounterDoc>) ||
  model<CounterDoc>("Counter", CounterSchema);

/** Atomically increment and return the next number for a given key. */
export async function nextSeq(key: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc!.seq;
}

/** Formatted id, e.g. formatSeq("WO", 7) => "WO-0007". */
export async function nextId(prefix: string, pad = 4): Promise<string> {
  const n = await nextSeq(prefix);
  return `${prefix}-${String(n).padStart(pad, "0")}`;
}

export default Counter;
