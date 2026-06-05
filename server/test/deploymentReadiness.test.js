import test from "node:test";
import assert from "node:assert/strict";
import {
  assertDeploymentBootable,
  evaluateDeploymentConfig,
  getDeploymentReadiness
} from "../src/config/deployment.js";

test("evaluateDeploymentConfig warns when local storage is used in single-instance mode", () => {
  const status = evaluateDeploymentConfig({
    instanceId: "instance-a",
    multiInstanceEnabled: false,
    trustProxy: 0,
    sharedStorageConfigured: false
  });

  assert.equal(status.issues.length, 0);
  assert.equal(status.warnings.length, 1);
  assert.equal(status.warnings[0].code, "local_storage_single_instance_only");
});

test("assertDeploymentBootable rejects unsafe multi-instance local storage deployments", () => {
  assert.throws(
    () =>
      assertDeploymentBootable({
        instanceId: "instance-b",
        multiInstanceEnabled: true,
        trustProxy: 0,
        sharedStorageConfigured: false
      }),
    /shared object storage/
  );
});

test("getDeploymentReadiness reports ready when database and multi-instance requirements are satisfied", () => {
  const readiness = getDeploymentReadiness({
    instanceId: "instance-c",
    multiInstanceEnabled: true,
    trustProxy: 1,
    sharedStorageConfigured: true,
    databaseReady: true,
    databaseStatus: "connected"
  });

  assert.equal(readiness.ok, true);
  assert.equal(readiness.issues.length, 0);
  assert.equal(readiness.databaseStatus, "connected");
  assert.equal(readiness.instanceId, "instance-c");
});
