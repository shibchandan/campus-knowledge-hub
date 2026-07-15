import Razorpay from "razorpay";
import crypto from "crypto";
import { Payment } from "./payment.model.js";
import { User } from "../auth/auth.model.js";
import { CommunityGroup } from "../community/community.model.js";

import { env } from "../../config/env.js";
import { CircuitBreaker } from "../../utils/circuitBreaker.js";

const razorpayCircuitBreaker = new CircuitBreaker("Razorpay", {
  failureThreshold: 3,
  requestTimeout: 8000, // 8 seconds timeout
  cooldownPeriod: 60000 // 60 seconds cooldown
});

// Initialize razorpay securely. Throw an error if keys are missing during initialization to fail fast.
if (!env.razorpayKeyId || !env.razorpayKeySecret) {
  console.warn("Payment gateway keys are missing. Payments will fail.");
}

const razorpay = new Razorpay({
  key_id: env.razorpayKeyId || "placeholder",
  key_secret: env.razorpayKeySecret || "placeholder",
});

export async function createOrder(req, res, next) {
  try {
    const { paymentType, targetId, extraCapacity } = req.body; // paymentType: "subscription" | "single_unlock" | "group_capacity"
    
    // ₹69 for subscription, ₹2 for single unlock, ₹25 per 100 slots for group_capacity
    const amountInRupees = paymentType === "subscription" ? 69 : 
                           paymentType === "group_capacity" ? (extraCapacity / 100) * 25 : 2; 
    const amountInPaise = amountInRupees * 100;

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpayCircuitBreaker.fire(
      () => razorpay.orders.create(options),
      (err) => { 
        throw new Error(err?.message ? `Payment Gateway Error: ${err.message}` : "Payment Gateway is currently unavailable. Please try again later."); 
      }
    );

    await Payment.create({
      user: req.user.id,
      razorpayOrderId: order.id,
      amount: amountInPaise,
      paymentType,
      targetId: paymentType === "single_unlock" || paymentType === "group_capacity" ? targetId : null,
      extraCapacity: paymentType === "group_capacity" ? extraCapacity : 0
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: env.razorpayKeyId
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const secret = env.razorpayKeySecret;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac("sha256", secret).update(body.toString()).digest("hex");

    if (expectedSignature !== razorpay_signature) {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ success: false, message: "Invalid payment signature." });
    }

    const order = await razorpayCircuitBreaker.fire(
      () => razorpay.orders.fetch(razorpay_order_id),
      (err) => { 
        throw new Error(err?.message ? `Payment Gateway Error: ${err.message}` : "Payment Gateway is currently unavailable. Please try again later."); 
      }
    );

    if (order.amount !== payment.amount) {
      return res.status(400).json({ success: false, message: "Payment amount mismatch." });
    }

    if (order.currency !== "INR") {
      return res.status(400).json({ success: false, message: "Currency mismatch." });
    }

    if (order.status !== "paid") {
      return res.status(400).json({ success: false, message: "Order not completed." });
    }

    payment.status = "paid";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    await payment.save();

    // Upgrade the user
    const user = await User.findById(req.user.id);
    if (payment.paymentType === "subscription") {
      const currentExpiry = user.premiumUntil && user.premiumUntil > new Date() ? user.premiumUntil : new Date();
      currentExpiry.setMonth(currentExpiry.getMonth() + 1); // Add 1 month
      user.premiumUntil = currentExpiry;
    } else if (payment.paymentType === "single_unlock" && payment.targetId) {
      if (!user.unlockedAssignments.includes(payment.targetId)) {
        user.unlockedAssignments.push(payment.targetId);
      }
    } else if (payment.paymentType === "group_capacity" && payment.targetId) {
      const group = await CommunityGroup.findById(payment.targetId);
      if (group) {
        group.maxCapacity += payment.extraCapacity;
        await group.save();
      }
    }
    
    await user.save();
    
    // Update req.user so that any subsequent checks reflect the new state immediately
    req.user.premiumUntil = user.premiumUntil;
    req.user.unlockedAssignments = user.unlockedAssignments;

    res.json({ success: true, message: "Payment verified successfully.", data: { paymentType: payment.paymentType } });
  } catch (error) {
    next(error);
  }
}
