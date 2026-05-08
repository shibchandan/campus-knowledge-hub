import mongoose from "mongoose";

const paymentOrderSchema = new mongoose.Schema(
  {
    gateway: { type: String, enum: ["razorpay"], default: "razorpay" },
    purpose: {
      type: String,
      enum: ["marketplace-item", "marketplace-subscription", "protected-resource"],
      required: true
    },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    marketplaceItem: { type: mongoose.Schema.Types.ObjectId, ref: "MarketplaceItem", default: null },
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", default: null },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "verified", "failed", "cancelled"],
      default: "created"
    },
    gatewayOrderId: { type: String, required: true, trim: true },
    gatewayPaymentId: { type: String, default: "", trim: true },
    gatewaySignature: { type: String, default: "", trim: true },
    gatewayReceipt: { type: String, default: "", trim: true },
    verifiedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

paymentOrderSchema.index({ buyer: 1, createdAt: -1 }, { name: "idx_payment_order_buyer_created" });
paymentOrderSchema.index({ gatewayOrderId: 1 }, { unique: true, name: "uniq_payment_gateway_order" });
paymentOrderSchema.index(
  { marketplaceItem: 1, buyer: 1, status: 1 },
  { name: "idx_payment_marketplace_buyer_status" }
);
paymentOrderSchema.index(
  { resource: 1, buyer: 1, status: 1 },
  { name: "idx_payment_resource_buyer_status" }
);

export const PaymentOrder = mongoose.model("PaymentOrder", paymentOrderSchema);
