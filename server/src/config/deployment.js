import { env } from "./env.js";
import { getDatabaseStatus, isDatabaseReady } from "./database.js";
import { cloudflareR2Configured } from "../services/resourceStorage.service.js";

function createIssue(code, message) {
  return { code, message };
}

export function evaluateDeploymentConfig(config = env) {
  const issues = [];
  const warnings = [];
  const sharedStorageConfigured =
    typeof config.sharedStorageConfigured === "boolean"
      ? config.sharedStorageConfigured
      : cloudflareR2Configured();

  if (config.multiInstanceEnabled && !sharedStorageConfigured) {
    issues.push(
      createIssue(
        "shared_storage_required",
        "Multi-instance deployment requires shared object storage. Configure Cloudflare R2 before enabling multiple instances."
      )
    );
  }

  if (config.multiInstanceEnabled && Number(config.trustProxy || 0) <= 0) {
    issues.push(
      createIssue(
        "trust_proxy_required",
        "Multi-instance deployment behind a load balancer requires TRUST_PROXY to be configured."
      )
    );
  }

  if (!config.multiInstanceEnabled && !sharedStorageConfigured) {
    warnings.push(
      createIssue(
        "local_storage_single_instance_only",
        "Resource files are stored on local disk. This is safe only for single-instance deployments."
      )
    );
  }

  return {
    instanceId: config.instanceId,
    multiInstanceEnabled: config.multiInstanceEnabled,
    sharedStorageConfigured,
    issues,
    warnings
  };
}

export function getDeploymentReadiness(config = env) {
  const configStatus = evaluateDeploymentConfig(config);
  const databaseStatus =
    typeof config.databaseStatus === "string" ? config.databaseStatus : getDatabaseStatus();
  const databaseReady =
    typeof config.databaseReady === "boolean" ? config.databaseReady : isDatabaseReady();
  const issues = [...configStatus.issues];

  if (!databaseReady) {
    issues.push(
      createIssue(
        "database_not_ready",
        "Database connection is not ready."
      )
    );
  }

  return {
    ok: issues.length === 0,
    instanceId: configStatus.instanceId,
    multiInstanceEnabled: configStatus.multiInstanceEnabled,
    sharedStorageConfigured: configStatus.sharedStorageConfigured,
    databaseStatus,
    issues,
    warnings: configStatus.warnings
  };
}

export function assertDeploymentBootable(config = env) {
  const status = evaluateDeploymentConfig(config);

  if (status.issues.length) {
    const details = status.issues.map((issue) => issue.message).join(" ");
    const error = new Error(`Deployment configuration is not bootable. ${details}`);
    error.statusCode = 500;
    error.details = status.issues;
    throw error;
  }

  return status;
}
