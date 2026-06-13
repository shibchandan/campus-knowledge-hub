import { Router } from "express";
import { authorize, optionalProtect, protect } from "../../middleware/authMiddleware.js";
import {
  getAvailableRepresentativeColleges,
  createApprovedCollegeCourse,
  createCollegeRequest,
  deleteApprovedCollegeCourse,
  deleteRepresentativeCollege,
  deleteCollegeProfile,
  decideCollegeRequest,
  getApprovedCollegeCourses,
  getCollegeProfile,
  getPendingRequestsForAdmin,
  getPublicColleges,
  getRepresentativeColleges,
  getRepresentativeRequests,
  updateApprovedCollegeCourse,
  upsertCollegeProfile,
  transferRepresentativeRights
} from "./governance.controller.js";
import { cacheMiddleware, invalidateCacheMiddleware } from "../../middleware/cacheMiddleware.js";

export const governanceRouter = Router();

governanceRouter.get("/approved-courses", optionalProtect, cacheMiddleware(300), getApprovedCollegeCourses);
governanceRouter.get("/public-colleges", cacheMiddleware(300), getPublicColleges);
governanceRouter.get(
  "/requestable-colleges",
  protect,
  authorize("representative", "admin"),
  getAvailableRepresentativeColleges
);
governanceRouter.post(
  "/approved-courses",
  protect,
  authorize("admin"),
  invalidateCacheMiddleware("/governance/approved-courses"),
  createApprovedCollegeCourse
);
governanceRouter.get(
  "/approved-courses/my",
  protect,
  authorize("representative"),
  getRepresentativeColleges
);
governanceRouter.patch(
  "/approved-courses/:courseId",
  protect,
  authorize("representative", "admin"),
  invalidateCacheMiddleware("/governance/approved-courses"),
  updateApprovedCollegeCourse
);
governanceRouter.delete(
  "/approved-courses/:courseId/college",
  protect,
  authorize("representative", "admin"),
  invalidateCacheMiddleware("/governance/approved-courses"),
  deleteRepresentativeCollege
);
governanceRouter.delete(
  "/approved-courses/:courseId",
  protect,
  authorize("representative", "admin"),
  invalidateCacheMiddleware("/governance/approved-courses"),
  deleteApprovedCollegeCourse
);
governanceRouter.get("/college-profile", optionalProtect, cacheMiddleware(300), getCollegeProfile);
governanceRouter.put(
  "/college-profile",
  protect,
  authorize("representative", "admin"),
  invalidateCacheMiddleware("/governance/college-profile"),
  upsertCollegeProfile
);
governanceRouter.delete(
  "/college-profile/:profileId",
  protect,
  authorize("representative", "admin"),
  invalidateCacheMiddleware("/governance/college-profile"),
  deleteCollegeProfile
);

governanceRouter.post(
  "/requests",
  protect,
  authorize("representative"),
  createCollegeRequest
);
governanceRouter.get(
  "/requests/my",
  protect,
  authorize("representative"),
  getRepresentativeRequests
);

governanceRouter.get(
  "/requests/pending",
  protect,
  authorize("admin"),
  getPendingRequestsForAdmin
);
governanceRouter.patch(
  "/requests/:requestId/decision",
  protect,
  authorize("admin"),
  decideCollegeRequest
);

governanceRouter.post(
  "/transfer-representative",
  protect,
  authorize("representative"),
  transferRepresentativeRights
);
