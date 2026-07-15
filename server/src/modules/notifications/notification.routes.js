import { Router } from "express";
import { protect as authenticate } from "../../middleware/authMiddleware.js";
import { getNotifications, markAllAsRead, markAsRead } from "./notification.controller.js";

export const notificationRoutes = Router();

notificationRoutes.use(authenticate);

notificationRoutes.get("/", getNotifications);
notificationRoutes.put("/read-all", markAllAsRead);
notificationRoutes.put("/:id/read", markAsRead);
