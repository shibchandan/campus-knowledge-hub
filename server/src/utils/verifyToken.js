import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function verifyTokenWithRotation(token) {
  let lastError = null;

  for (const secret of env.jwtAllVerificationSecrets) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Invalid token");
}
