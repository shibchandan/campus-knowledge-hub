import mongoose from "mongoose";
import { env } from "./env.js";
import { logAppEvent } from "../services/logger.service.js";

export async function connectDatabase() {
  if (!env.mongodbUri) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(env.mongodbUri);
  console.log("MongoDB connected");
  logAppEvent("info", "mongodb_connected");
}
