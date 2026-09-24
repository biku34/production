/**
 * CLI seed runner:  npm run seed
 * Loads .env.local, then runs the shared seed. Requires a real MONGODB_URI.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { seedDatabase } from "../lib/seed";
import mongoose from "mongoose";

(async () => {
  try {
    console.log("Seeding fabric_production database...");
    const result = await seedDatabase();
    console.log("Seed complete:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
})();
