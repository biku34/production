// Importing this module registers every schema with Mongoose, which is required
// before any .populate() across refs works. API routes import from here.
export { default as User } from "./User";
export { default as Material } from "./Material";
export { default as Vendor } from "./Vendor";
export { default as Machine } from "./Machine";
export { default as Product } from "./Product";
export { default as SalesOrder } from "./SalesOrder";
export { default as WorkOrder } from "./WorkOrder";
export { default as StageEntry } from "./StageEntry";
export { default as MaterialIssue } from "./MaterialIssue";
export { default as Lot } from "./Lot";
export { default as Roll } from "./Roll";
export { default as QcInspection } from "./QcInspection";
export { default as JobworkDispatch } from "./JobworkDispatch";
export { default as Counter, nextId, nextSeq } from "./Counter";
