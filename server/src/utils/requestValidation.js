import mongoose from "mongoose";

export function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function readString(value, { field, min = 0, max = 500, required = true } = {}) {
  const text = String(value || "").trim();

  if (!text) {
    if (required) {
      throw createHttpError(`${field || "Value"} is required.`);
    }
    return "";
  }

  if (text.length < min) {
    throw createHttpError(`${field || "Value"} must be at least ${min} characters long.`);
  }

  if (text.length > max) {
    throw createHttpError(`${field || "Value"} must be ${max} characters or fewer.`);
  }

  return text;
}

export function readEnum(value, { field, allowed, defaultValue = "" } = {}) {
  const text = String(value || defaultValue).trim().toLowerCase();

  if (!allowed?.includes(text)) {
    throw createHttpError(`${field || "Value"} must be one of: ${allowed.join(", ")}.`);
  }

  return text;
}

export function readPositiveInt(value, { field, min = 1, max = 100, defaultValue = min } = {}) {
  const parsed = Number(value ?? defaultValue);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw createHttpError(`${field || "Value"} must be a whole number between ${min} and ${max}.`);
  }

  return parsed;
}

export function readMongoId(value, { field = "id", required = true } = {}) {
  const id = String(value || "").trim();

  if (!id) {
    if (required) {
      throw createHttpError(`${field} is required.`);
    }
    return "";
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createHttpError(`Invalid ${field}.`);
  }

  return id;
}

export function normalizeCollegeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function readPagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const page = Math.max(1, readPositiveInt(query.page, { field: "page", min: 1, max: 100000, defaultValue: 1 }));
  const limit = readPositiveInt(query.limit, {
    field: "limit",
    min: 1,
    max: maxLimit,
    defaultValue: defaultLimit
  });

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

export function readSearchPattern(value, { max = 100 } = {}) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  const bounded = text.slice(0, max);
  return bounded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
