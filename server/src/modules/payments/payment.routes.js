import { Router } from "express";
import { createOrder, verifyPayment } from "./payment.controller.js";
import { protect } from "../../middleware/authMiddleware.js";

export const paymentRouter = Router();

paymentRouter.post("/create-order", protect, createOrder);
paymentRouter.post("/verify", protect, verifyPayment);
