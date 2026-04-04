import mongoose from "mongoose";
import { env } from "../config/env.js";

function supportsTransactions() {
  const uri = String(env.mongodbUri || "").toLowerCase();
  return uri.startsWith("mongodb+srv://") || uri.includes("replicaset=");
}

export async function runWithOptionalTransaction(work) {
  if (!supportsTransactions()) {
    return work(null);
  }

  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export function withSession(query, session) {
  return session ? query.session(session) : query;
}
