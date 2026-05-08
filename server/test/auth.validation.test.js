import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAdminCreateUserPayload,
  validateChangePasswordPayload,
  validateRegisterPayload,
  validateStudentVerificationSubmissionPayload
} from "../src/modules/auth/auth.validation.js";

test("register validation allows student with required college verification fields", () => {
  const payload = validateRegisterPayload({
    fullName: "Student User",
    email: "student@example.com",
    password: "secret123",
    role: "student",
    collegeName: "Motilal Nehru National Institute of Technology, Prayagraj",
    collegeStudentId: "BT22CSE001"
  });

  assert.equal(payload.role, "student");
  assert.equal(payload.collegeName, "Motilal Nehru National Institute of Technology, Prayagraj");
  assert.equal(payload.collegeStudentId, "BT22CSE001");
});

test("register validation allows representative self-registration", () => {
  const payload = validateRegisterPayload({
    fullName: "Representative User",
    email: "rep@example.com",
    password: "secret123",
    role: "representative"
  });

  assert.equal(payload.role, "representative");
});

test("register validation rejects student without college details", () => {
  assert.throws(
    () =>
      validateRegisterPayload({
        fullName: "Student User",
        email: "student@example.com",
        password: "secret123",
        role: "student"
      }),
    /College name is required for student registration/
  );
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

test("student verification submission validation accepts college details", () => {
  const payload = validateStudentVerificationSubmissionPayload({
    collegeName: "Motilal Nehru National Institute of Technology, Prayagraj",
    collegeStudentId: "BT22CSE001",
    officialCollegeEmail: "student@mnnit.ac.in"
  });

  assert.equal(payload.collegeName, "Motilal Nehru National Institute of Technology, Prayagraj");
  assert.equal(payload.collegeStudentId, "BT22CSE001");
  assert.equal(payload.officialCollegeEmail, "student@mnnit.ac.in");
});

test("student verification submission validation rejects invalid college id", () => {
  assert.throws(
    () =>
      validateStudentVerificationSubmissionPayload({
        collegeName: "Motilal Nehru National Institute of Technology, Prayagraj",
        collegeStudentId: "bad id!"
      }),
    /College ID can contain only/
  );
});
