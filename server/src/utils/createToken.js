import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function createToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}
