import Razorpay from "razorpay";
import crypto from "crypto";
import { Payment } from "./payment.model.js";
import { User } from "../auth/auth.model.js";
import { CommunityGroup } from "../community/community.model.js";

// Initialize razorpay securely. Fallback to mock keys if env variables are missing to prevent crashes.
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_mockkeyid123456",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "mockkeysecret1234567890",
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

    const order = await razorpay.orders.create(options);

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
        key: process.env.RAZORPAY_KEY_ID || "rzp_test_mockkeyid123456" // Send key_id to client
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

    const secret = process.env.RAZORPAY_KEY_SECRET || "mockkeysecret1234567890";
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac("sha256", secret).update(body.toString()).digest("hex");

    if (expectedSignature !== razorpay_signature) {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ success: false, message: "Invalid payment signature." });
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
