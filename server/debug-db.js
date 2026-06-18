import mongoose from "mongoose";
import { connectDatabase } from "./src/config/database.js";
import { CollegeProfile } from "./src/modules/governance/governance.model.js";

async function run() {
  await connectDatabase();
  const indexes = await CollegeProfile.collection.indexes();
  console.log("INDEXES:", JSON.stringify(indexes, null, 2));
  const docs = await CollegeProfile.find({ collegeNameNormalized: /motilal/i });
  console.log("DOCS:", JSON.stringify(docs, null, 2));
  process.exit(0);
}
run();
