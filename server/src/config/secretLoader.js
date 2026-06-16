import fs from "fs";

function readFromFile(filePath) {
  try {
    if (!filePath) {
      return "";
    }

    if (!fs.existsSync(filePath)) {
      return "";
    }

    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return "";
  }
}

export function readConfigValue(key, fallback = "") {
  const directValue = String(process.env[key] || "").trim();

  if (directValue) {
    return directValue;
  }

  const fileValue = readFromFile(String(process.env[`${key}_FILE`] || "").trim());
  return fileValue || fallback;
}

export function readSecretValue(key, fallback = "") {
  const isProd = (process.env.NODE_ENV || "").trim().toLowerCase() === "production";

  if (isProd) {
    if (process.env[key]) {
      console.warn(`SECURITY WARNING: ${key} was passed as a direct environment variable in production. To prevent key leakage in process dumps, only ${key}_FILE is allowed.`);
    }
    const fileValue = readFromFile(String(process.env[`${key}_FILE`] || "").trim());
    if (!fileValue && process.env[key]) {
      throw new Error(`FATAL ERROR: ${key} must be securely provided via ${key}_FILE in production.`);
    }
    return fileValue || fallback;
  }

  return readConfigValue(key, fallback);
}

export function readListValue(key) {
  const value = readConfigValue(key, "");
  if (!value) {
    return [];
  }

  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
