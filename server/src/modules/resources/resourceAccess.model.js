import mongoose from "mongoose";

const resourceAccessPurchaseSchema = new mongoose.Schema(
  {
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, default: "INR" },
    accessType: {
      type: String,
      enum: ["paid-unlock", "basic-subscription"],
      required: true
    }
  },
  { timestamps: true }
);

resourceAccessPurchaseSchema.index({ resource: 1, buyer: 1 }, { unique: true });
resourceAccessPurchaseSchema.index({ buyer: 1, createdAt: -1 });

export const ResourceAccessPurchase = mongoose.model(
  "ResourceAccessPurchase",
  resourceAccessPurchaseSchema
);
