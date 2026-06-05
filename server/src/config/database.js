import mongoose from "mongoose";
import { env } from "./env.js";
import { logAppEvent } from "../services/logger.service.js";

const connectionStateNames = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

export async function connectDatabase() {
  if (!env.mongodbUri) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(env.mongodbUri);
  console.log("MongoDB connected");
  logAppEvent("info", "mongodb_connected");
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logAppEvent("info", "mongodb_disconnected");
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

export function getDatabaseStatus() {
  return connectionStateNames[mongoose.connection.readyState] || "unknown";
}
