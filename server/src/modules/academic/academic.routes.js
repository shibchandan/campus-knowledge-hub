import { Router } from "express";
import { authorize, optionalProtect, protect } from "../../middleware/authMiddleware.js";
import {
  createAcademicStructure,
  createAcademicSubject,
  deleteAcademicStructure,
  deleteAcademicSubject,
  listAcademicStructures,
  listAcademicSubjects,
  updateAcademicStructure,
  updateAcademicSubject
} from "./academic.controller.js";
import { cacheMiddleware, invalidateCacheMiddleware } from "../../middleware/cacheMiddleware.js";

export const academicRouter = Router();

academicRouter.get("/structures", optionalProtect, cacheMiddleware(300), listAcademicStructures);
academicRouter.post(
  "/structures",
  protect,
  authorize("admin", "representative"),
  invalidateCacheMiddleware("/academic/structures"),
  createAcademicStructure
);
academicRouter.patch(
  "/structures/:structureId",
  protect,
  authorize("admin", "representative"),
  invalidateCacheMiddleware("/academic/structures"),
  updateAcademicStructure
);
academicRouter.delete(
  "/structures/:structureId",
  protect,
  authorize("admin", "representative"),
  invalidateCacheMiddleware("/academic/structures"),
  deleteAcademicStructure
);
academicRouter.get("/subjects", optionalProtect, cacheMiddleware(300), listAcademicSubjects);
academicRouter.post(
  "/subjects",
  protect,
  authorize("admin", "representative"),
  invalidateCacheMiddleware("/academic/subjects"),
  createAcademicSubject
);
academicRouter.patch(
  "/subjects/:subjectRecordId",
  protect,
  authorize("admin", "representative"),
  invalidateCacheMiddleware("/academic/subjects"),
  updateAcademicSubject
);
academicRouter.delete(
  "/subjects/:subjectRecordId",
  protect,
  authorize("admin", "representative"),
  invalidateCacheMiddleware("/academic/subjects"),
  deleteAcademicSubject
);
