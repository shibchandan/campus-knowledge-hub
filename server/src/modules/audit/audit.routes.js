import { Router } from "express";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import { listAuditLogs } from "./audit.controller.js";

export const auditRouter = Router();

auditRouter.get("/logs", protect, authorize("admin"), listAuditLogs);
