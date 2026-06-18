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
    // Prefer file-based secrets in production for security
    const fileValue = readFromFile(String(process.env[`${key}_FILE`] || "").trim());
    if (fileValue) {
      return fileValue;
    }

    // Fall back to direct env var (needed for platforms like Render that don't support secret files)
    const directValue = String(process.env[key] || "").trim();
    if (directValue) {
      return directValue;
    }

    return fallback;
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
