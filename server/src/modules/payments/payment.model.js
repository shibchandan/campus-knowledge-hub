import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
    paymentType: { type: String, enum: ["subscription", "single_unlock"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", default: null }, // Only for single_unlock
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
