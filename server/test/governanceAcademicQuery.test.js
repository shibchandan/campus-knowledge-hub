import test from "node:test";
import assert from "node:assert/strict";
import {
  getApprovedCollegeCourses,
  getAvailableRepresentativeColleges
} from "../src/modules/governance/governance.controller.js";
import { listAcademicStructures, listAcademicSubjects } from "../src/modules/academic/academic.controller.js";
import { CollegeCourse } from "../src/modules/governance/governance.model.js";
import { AcademicStructure } from "../src/modules/academic/academicStructure.model.js";
import { AcademicSubject } from "../src/modules/academic/academic.model.js";

test("getAvailableRepresentativeColleges uses an aggregate match for normalized search", async () => {
  const originalAggregate = CollegeCourse.aggregate;
  let seenPipeline = null;
  let responsePayload = null;

  CollegeCourse.aggregate = async (pipeline) => {
    seenPipeline = pipeline;
    return [{ collegeName: "AB college", collegeNameNormalized: "ab college", courses: [] }];
  };

  try {
    await getAvailableRepresentativeColleges(
      {
        query: { search: "AB college" }
      },
      {
        json(payload) {
          responsePayload = payload;
        }
      },
      (error) => {
        if (error) {
          throw error;
        }
      }
    );
  } finally {
    CollegeCourse.aggregate = originalAggregate;
  }

  assert.equal(seenPipeline[0].$match.collegeNameNormalized.$regex, "ab college");
  assert.equal(seenPipeline[0].$match.collegeNameNormalized.$options, "i");
  assert.equal(responsePayload.data[0].collegeName, "AB college");
});

test("getApprovedCollegeCourses sanitizes non-admin user details and strips helper fields", async () => {
  const originalAggregate = CollegeCourse.aggregate;
  let responsePayload = null;

  CollegeCourse.aggregate = async () => [
    {
      _id: "course-1",
      collegeName: "AB college",
      collegeNameNormalized: "ab college",
      addedByRepresentative: {
        _id: "rep-1",
        fullName: "Rep One",
        email: "rep@example.com",
        role: "representative",
        status: "active"
      },
      approvedByAdmin: {
        _id: "admin-1",
        fullName: "Admin One",
        email: "admin@example.com",
        role: "admin",
        status: "active"
      },
      profile: {
        _id: "profile-1",
        collegeName: "AB college",
        collegeNameNormalized: "ab college"
      },
      profileRepresentative: {
        _id: "rep-2",
        fullName: "Rep Two",
        email: "rep2@example.com",
        role: "representative",
        status: "active"
      }
    }
  ];

  try {
    await getApprovedCollegeCourses(
      {
        query: {},
        user: { id: "student-1", role: "student", studentVerificationStatus: "verified", collegeName: "AB college" }
      },
      {
        json(payload) {
          responsePayload = payload;
        }
      },
      (error) => {
        if (error) {
          throw error;
        }
      }
    );
  } finally {
    CollegeCourse.aggregate = originalAggregate;
  }

  assert.equal(responsePayload.data[0].addedByRepresentative.email, undefined);
  assert.equal(responsePayload.data[0].approvedByAdmin.email, undefined);
  assert.equal(responsePayload.data[0].profile.enteredByRepresentative.email, undefined);
  assert.equal("profileRepresentative" in responsePayload.data[0], false);
});

test("listAcademicSubjects applies scope filters and uses lean query results", async () => {
  const originalFind = AcademicSubject.find;
  const seen = {};
  let responsePayload = null;

  AcademicSubject.find = (filters) => {
    seen.filters = filters;
    return {
      sort(sortSpec) {
        seen.sort = sortSpec;
        return this;
      },
      lean() {
        seen.leanCalled = true;
        return Promise.resolve([{ subjectId: "mathematics-1" }]);
      }
    };
  };

  try {
    await listAcademicSubjects(
      {
        query: { programId: "btech", branchId: "computer-science", semesterId: "semester-1" },
        user: {
          role: "student",
          studentVerificationStatus: "verified",
          collegeName: "AB college"
        }
      },
      {
        json(payload) {
          responsePayload = payload;
        }
      },
      (error) => {
        if (error) {
          throw error;
        }
      }
    );
  } finally {
    AcademicSubject.find = originalFind;
  }

  assert.equal(seen.filters.collegeNameNormalized, "ab college");
  assert.equal(seen.filters.programId, "btech");
  assert.equal(seen.filters.branchId, "computer-science");
  assert.equal(seen.filters.semesterId, "semester-1");
  assert.deepEqual(seen.sort, { semesterId: 1, createdAt: 1 });
  assert.equal(seen.leanCalled, true);
  assert.equal(responsePayload.data[0].subjectId, "mathematics-1");
});

test("listAcademicStructures applies scope filters and uses lean query results", async () => {
  const originalFind = AcademicStructure.find;
  const seen = {};
  let responsePayload = null;

  AcademicStructure.find = (filters) => {
    seen.filters = filters;
    return {
      sort(sortSpec) {
        seen.sort = sortSpec;
        return this;
      },
      lean() {
        seen.leanCalled = true;
        return Promise.resolve([{ semesterId: "semester-1" }]);
      }
    };
  };

  try {
    await listAcademicStructures(
      {
        query: { collegeName: "AB college", programId: "btech", branchId: "computer-science" },
        user: { role: "admin" }
      },
      {
        json(payload) {
          responsePayload = payload;
        }
      },
      (error) => {
        if (error) {
          throw error;
        }
      }
    );
  } finally {
    AcademicStructure.find = originalFind;
  }

  assert.equal(seen.filters.collegeNameNormalized, "ab college");
  assert.equal(seen.filters.programId, "btech");
  assert.equal(seen.filters.branchId, "computer-science");
  assert.deepEqual(seen.sort, { programName: 1, branchName: 1, semesterOrder: 1 });
  assert.equal(seen.leanCalled, true);
  assert.equal(responsePayload.data[0].semesterId, "semester-1");
});
