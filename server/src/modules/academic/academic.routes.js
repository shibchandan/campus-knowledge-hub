import { Router } from "express";
import { authorize, protect } from "../../middleware/authMiddleware.js";
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

export const academicRouter = Router();

academicRouter.get("/structures", protect, listAcademicStructures);
academicRouter.post("/structures", protect, authorize("admin"), createAcademicStructure);
academicRouter.patch("/structures/:structureId", protect, authorize("admin"), updateAcademicStructure);
academicRouter.delete("/structures/:structureId", protect, authorize("admin"), deleteAcademicStructure);
academicRouter.get("/subjects", protect, listAcademicSubjects);
academicRouter.post("/subjects", protect, authorize("admin"), createAcademicSubject);
academicRouter.patch("/subjects/:subjectRecordId", protect, authorize("admin"), updateAcademicSubject);
academicRouter.delete("/subjects/:subjectRecordId", protect, authorize("admin"), deleteAcademicSubject);
