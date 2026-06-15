import { Router } from "express";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import { getAnalytics, getPendingEmailMigrations, processEmailMigration } from "./admin.controller.js";

const router = Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/analytics", getAnalytics);
router.get("/email-migrations", getPendingEmailMigrations);
router.post("/email-migrations/:userId", processEmailMigration);

export default router;
