import { Router } from "express";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import {
  getAvailableRepresentativeColleges,
  createApprovedCollegeCourse,
  createCollegeRequest,
  deleteApprovedCollegeCourse,
  deleteCollegeProfile,
  decideCollegeRequest,
  getApprovedCollegeCourses,
  getCollegeProfile,
  getPendingRequestsForAdmin,
  getRepresentativeColleges,
  getRepresentativeRequests,
  updateApprovedCollegeCourse,
  upsertCollegeProfile
} from "./governance.controller.js";

export const governanceRouter = Router();

governanceRouter.get("/approved-courses", protect, getApprovedCollegeCourses);
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
  updateApprovedCollegeCourse
);
governanceRouter.delete(
  "/approved-courses/:courseId",
  protect,
  authorize("representative", "admin"),
  deleteApprovedCollegeCourse
);
governanceRouter.get("/college-profile", protect, getCollegeProfile);
governanceRouter.put(
  "/college-profile",
  protect,
  authorize("representative", "admin"),
  upsertCollegeProfile
);
governanceRouter.delete(
  "/college-profile/:profileId",
  protect,
  authorize("representative", "admin"),
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
