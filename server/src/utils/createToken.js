import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import crypto from "crypto";

export function createToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function createRefreshToken(payload) {
  const payloadWithJti = { ...payload, jti: crypto.randomUUID() };
  return jwt.sign(payloadWithJti, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn });
}
