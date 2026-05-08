import dotenv from "dotenv";
import { readConfigValue, readListValue } from "./secretLoader.js";

dotenv.config();

const resolvedJwtSecret = readConfigValue("JWT_SECRET", "development-secret");
const resolvedJwtPreviousSecrets = readListValue("JWT_PREVIOUS_SECRETS").filter(
  (secret) => secret !== resolvedJwtSecret
);

export const env = {
  port: Number(process.env.PORT || 5000),
  mongodbUri: process.env.MONGODB_URI || "",
  jwtSecret: resolvedJwtSecret,
  jwtPreviousSecrets: resolvedJwtPreviousSecrets,
  jwtAllVerificationSecrets: [resolvedJwtSecret, ...resolvedJwtPreviousSecrets],
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  nodeEnv: (process.env.NODE_ENV || "development").trim().toLowerCase(),
  trustProxy: Number(process.env.TRUST_PROXY || 0),
  enforceHttps: String(process.env.ENFORCE_HTTPS || "false").trim().toLowerCase() === "true",
  authCookieName: process.env.AUTH_COOKIE_NAME || "campus_auth",
  authTokenInCookie:
    String(process.env.AUTH_TOKEN_IN_COOKIE || "false").trim().toLowerCase() === "true",
  cookieSameSite: (process.env.COOKIE_SAMESITE || "lax").trim().toLowerCase(),
  cookieSecure:
    String(process.env.COOKIE_SECURE || "false").trim().toLowerCase() === "true" ||
    (process.env.NODE_ENV || "").trim().toLowerCase() === "production",
  malwareScanMode: (process.env.MALWARE_SCAN_MODE || "off").trim().toLowerCase(),
  malwareScanCommand: process.env.MALWARE_SCAN_COMMAND || "clamscan",
  malwareScanArgs: String(process.env.MALWARE_SCAN_ARGS || "--no-summary")
    .trim()
    .split(/\s+/)
    .filter(Boolean),
  malwareScanTimeoutMs: Number(process.env.MALWARE_SCAN_TIMEOUT_MS || 30000),
  malwareScanBlockOnError:
    String(process.env.MALWARE_SCAN_BLOCK_ON_ERROR || "true").trim().toLowerCase() === "true",
  aiProvider: (process.env.AI_PROVIDER || "").trim().toLowerCase(),
  openAiApiKey: readConfigValue("OPENAI_API_KEY", ""),
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  geminiApiKey: readConfigValue("GEMINI_API_KEY", ""),
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  anthropicApiKey: readConfigValue("ANTHROPIC_API_KEY", ""),
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: String(process.env.SMTP_SECURE || "false").trim().toLowerCase() === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: readConfigValue("SMTP_PASS", ""),
  smtpFrom: process.env.SMTP_FROM || "no-reply@campus-knowledge-hub.local",
  r2Endpoint: process.env.R2_ENDPOINT || "",
  r2BucketName: process.env.R2_BUCKET_NAME || "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  r2SecretAccessKey: readConfigValue("R2_SECRET_ACCESS_KEY", ""),
  r2PublicBaseUrl: process.env.R2_PUBLIC_BASE_URL || "",
  r2Folder: process.env.R2_FOLDER || "campus-knowledge-hub",
  marketplacePlatformFeePercent: Number(process.env.MARKETPLACE_PLATFORM_FEE_PERCENT || 5),
  marketplaceGstPercent: Number(process.env.MARKETPLACE_GST_PERCENT || 18),
  marketplaceBasicSubscriptionDays: Number(process.env.MARKETPLACE_BASIC_SUBSCRIPTION_DAYS || 30),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: readConfigValue("RAZORPAY_KEY_SECRET", ""),
  abuseProtectionEnabled:
    String(process.env.ABUSE_PROTECTION_ENABLED || "true").trim().toLowerCase() === "true",
  abuseRequireUserAgent:
    String(process.env.ABUSE_REQUIRE_USER_AGENT || "true").trim().toLowerCase() === "true",
  blockedIpSet: new Set(readListValue("BLOCKED_IPS"))
};
