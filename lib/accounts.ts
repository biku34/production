import type { Role, Stage } from "@/lib/domain";

/**
 * Demo login accounts — one per role (SRS §2.3). Placeholder RBAC for the
 * showcase: real usernames + a shared default password, seeded into MongoDB.
 * This module has NO server-only imports so it can be shared by the seed
 * (server) and the login page (client, to render the demo hint).
 *
 * NOTE: default credentials are for the demo only — rotate before any real use.
 */
export const DEFAULT_PASSWORD = "fabric123";

export interface DemoAccount {
  username: string;
  name: string;
  email: string;
  role: Role;
  stages?: Stage[];
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: "admin", name: "Asha Rao", email: "asha.admin@plant.local", role: "PlantAdmin" },
  { username: "planner", name: "Vikram Shah", email: "vikram.planner@plant.local", role: "ProductionPlanner" },
  { username: "store", name: "Sunita Devi", email: "sunita.store@plant.local", role: "StoreKeeper" },
  { username: "weaving", name: "Ramesh K", email: "ramesh.weaving@plant.local", role: "StageSupervisor", stages: ["Weaving"] },
  { username: "dyeing", name: "Farah N", email: "farah.dyeing@plant.local", role: "StageSupervisor", stages: ["Dyeing"] },
  { username: "finishing", name: "Iqbal M", email: "iqbal.finishing@plant.local", role: "StageSupervisor", stages: ["Finishing"] },
  { username: "qc", name: "Deepa S", email: "deepa.qc@plant.local", role: "QCInspector" },
  { username: "jobwork", name: "Naveen P", email: "naveen.jobwork@plant.local", role: "JobWorkCoordinator" },
  { username: "packing", name: "Gita B", email: "gita.packing@plant.local", role: "PackingDispatch" },
];
