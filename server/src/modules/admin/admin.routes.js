import { Router } from "express";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import { getAnalytics } from "./admin.controller.js";

const router = Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/analytics", getAnalytics);

export default router;
