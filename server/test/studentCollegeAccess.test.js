import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCollegeNameRegex,
  collegeNameMatches,
  normalizeCourseAccessKey,
  requireStudentAssignedCollege,
  resolveStudentCollegeScope
} from "../src/utils/studentCollegeAccess.js";

test("requireStudentAssignedCollege returns verified student college context", () => {
  const result = requireStudentAssignedCollege({
    user: {
      role: "student",
      studentVerificationStatus: "verified",
      collegeName: "Motilal Nehru National Institute of Technology, Prayagraj"
    }
  });

  assert.equal(result.collegeName, "Motilal Nehru National Institute of Technology, Prayagraj");
  assert.equal(result.collegeNameNormalized, "motilal nehru national institute of technology, prayagraj");
});

test("requireStudentAssignedCollege rejects pending student verification", () => {
  assert.throws(
    () =>
      requireStudentAssignedCollege({
        user: {
          role: "student",
          studentVerificationStatus: "pending",
          collegeName: "Motilal Nehru National Institute of Technology, Prayagraj"
        }
      }),
    /waiting for admin college ID verification/
  );
});

test("resolveStudentCollegeScope blocks mismatched student college requests", () => {
  assert.throws(
    () =>
      resolveStudentCollegeScope(
        {
          user: {
            role: "student",
            studentVerificationStatus: "verified",
            collegeName: "Motilal Nehru National Institute of Technology, Prayagraj"
          }
        },
        "Indian Institute of Technology Kanpur"
      ),
    /Students can access data only for their assigned college/
  );
});

test("resolveStudentCollegeScope uses requested college for non-student roles", () => {
  const result = resolveStudentCollegeScope(
    {
      user: {
        role: "admin"
      }
    },
    "Indian Institute of Technology Kanpur"
  );

  assert.equal(result.collegeName, "Indian Institute of Technology Kanpur");
  assert.equal(result.isStudentScoped, false);
});

test("college helpers normalize and match flexible spacing", () => {
  assert.equal(
    collegeNameMatches(
      "Motilal  Nehru National Institute of Technology, Prayagraj",
      "Motilal Nehru National Institute of Technology, Prayagraj"
    ),
    true
  );

  const regex = buildCollegeNameRegex("Indian Institute of Technology Kanpur");
  assert.equal(regex.test("Indian   Institute of Technology Kanpur"), true);
  assert.equal(regex.test("Indian Institute of Technology Delhi"), false);
});

test("normalizeCourseAccessKey produces stable matching keys", () => {
  assert.equal(normalizeCourseAccessKey("B.Tech Computer Science"), "b-tech-computer-science");
  assert.equal(normalizeCourseAccessKey(" BTech  "), "btech");
});
