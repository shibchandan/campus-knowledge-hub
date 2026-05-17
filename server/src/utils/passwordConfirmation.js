import { User } from "../modules/auth/auth.model.js";
import { createHttpError, readString } from "./requestValidation.js";

export async function requirePasswordConfirmation(req) {
  const currentPassword = readString(req.body?.currentPassword, {
    field: "Current password",
    min: 6,
    max: 200
  });

  const user = await User.findById(req.user.id).select("+password");

  if (!user) {
    throw createHttpError("Authenticated user not found.", 401);
  }

  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw createHttpError("Current password is incorrect.", 403);
  }
}
