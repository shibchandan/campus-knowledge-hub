import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { getNotifications, markAllAsRead, markAsRead } from "./notification.controller.js";

export const notificationRoutes = Router();

notificationRoutes.use(authenticate);

notificationRoutes.get("/", getNotifications);
notificationRoutes.put("/read-all", markAllAsRead);
notificationRoutes.put("/:id/read", markAsRead);
