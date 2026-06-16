function sanitizeString(value) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .trim();
}

function sanitizeValue(value) {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    const sanitizedObj = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      let sanitizedKey = key;
      if (typeof key === "string") {
        sanitizedKey = key.replace(/^\$/, "").replace(/\./g, "");
      }
      sanitizedObj[sanitizedKey] = sanitizeValue(nestedValue);
    }
    return sanitizedObj;
  }

  return value;
}

export function sanitizeRequest(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === "object") {
    req.query = sanitizeValue(req.query);
  }

  if (req.params && typeof req.params === "object") {
    req.params = sanitizeValue(req.params);
  }

  next();
}
