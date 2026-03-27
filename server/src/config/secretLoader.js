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
