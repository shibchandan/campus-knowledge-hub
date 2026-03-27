import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAdminCreateUserPayload,
  validateChangePasswordPayload,
  validateRegisterPayload
} from "../src/modules/auth/auth.validation.js";

test("register validation allows student and representative", () => {
  const payload = validateRegisterPayload({
    fullName: "Student User",
    email: "student@example.com",
    password: "secret123",
    role: "student"
  });

  assert.equal(payload.role, "student");
});

test("register validation blocks self-service admin registration", () => {
  assert.throws(
    () =>
      validateRegisterPayload({
        fullName: "Admin User",
        email: "admin@example.com",
        password: "secret123",
        role: "admin"
      }),
    /Only student and representative self-registration is allowed/
  );
});

test("admin create user validation accepts admin role", () => {
  const payload = validateAdminCreateUserPayload({
    fullName: "Root Admin",
    email: "root@example.com",
    password: "secret123",
    role: "admin",
    status: "active"
  });

  assert.equal(payload.role, "admin");
});

test("change password validation rejects same password", () => {
  assert.throws(
    () =>
      validateChangePasswordPayload({
        currentPassword: "secret123",
        newPassword: "secret123"
      }),
    /New password must be different/
  );
});
