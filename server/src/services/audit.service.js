import { AuditLog } from "../modules/audit/audit.model.js";
import { logAppEvent } from "./logger.service.js";

export async function createAuditLog({
  req,
  action,
  entityType,
  entityId = "",
  status = "success",
  message = "",
  metadata = {}
}) {
  try {
    const audit = await AuditLog.create({
      actorUserId: req?.user?.id || null,
      actorEmail: req?.user?.email || "",
      actorRole: req?.user?.role || "",
      action,
      entityType,
      entityId: String(entityId || ""),
      status,
      message,
      metadata,
      ipAddress: req?.ip || req?.headers?.["x-forwarded-for"] || ""
    });

    logAppEvent("info", `audit:${action}`, {
      entityType,
      entityId: String(entityId || ""),
      status,
      actorEmail: req?.user?.email || ""
    });

    return audit;
  } catch (error) {
    logAppEvent("error", "audit_log_failed", {
      action,
      entityType,
      entityId: String(entityId || ""),
      error: error.message
    });
    return null;
  }
}
