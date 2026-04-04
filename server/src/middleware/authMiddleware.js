import { env } from "../config/env.js";
import { User } from "../modules/auth/auth.model.js";
import { verifyTokenWithRotation } from "../utils/verifyToken.js";

function getTokenFromCookies(req) {
  const rawCookies = req.headers.cookie;

  if (!rawCookies) {
    return "";
  }

  const cookieEntries = rawCookies.split(";").map((item) => item.trim());
  const match = cookieEntries.find((entry) => entry.startsWith(`${env.authCookieName}=`));

  if (!match) {
    return "";
  }

  return decodeURIComponent(match.substring(env.authCookieName.length + 1));
}

export async function protect(req, _res, next) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : "";
  const tokenFromCookie = getTokenFromCookies(req);
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    return next(error);
  }

  try {
    const decoded = verifyTokenWithRotation(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 401;
      return next(error);
    }

    const status = user.status || "active";

    if (status !== "active") {
      const error = new Error(
        status === "banned"
          ? "This account has been banned by an administrator."
          : "This account has been suspended by an administrator."
      );
      error.statusCode = 403;
      return next(error);
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      collegeName: user.collegeName || "",
      collegeStudentId: user.collegeStudentId || "",
      studentVerificationStatus: user.studentVerificationStatus || "none",
      status
    };
    return next();
  } catch {
    const error = new Error("Invalid token");
    error.statusCode = 401;
    return next(error);
  }
}

export async function optionalProtect(req, _res, next) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : "";
  const tokenFromCookie = getTokenFromCookies(req);
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyTokenWithRotation(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next();
    }

    const status = user.status || "active";
    if (status !== "active") {
      return next();
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      collegeName: user.collegeName || "",
      collegeStudentId: user.collegeStudentId || "",
      studentVerificationStatus: user.studentVerificationStatus || "none",
      status
    };
    return next();
  } catch {
    return next();
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      return next(error);
    }

    return next();
  };
}
