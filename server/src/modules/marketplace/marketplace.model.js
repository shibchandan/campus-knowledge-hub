import mongoose from "mongoose";

const marketplaceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    resourceType: {
      type: String,
      enum: ["course", "notes", "pyq", "book", "bundle", "subscription"],
      default: "course"
    },
    subscriptionPlan: {
      type: String,
      enum: ["none", "basic"],
      default: "none"
    },
    subscriptionDurationDays: { type: Number, min: 0, default: 0 },
    courseTag: { type: String, enum: ["free-course", "paid-course"], default: "free-course" },
    basePrice: { type: Number, required: true, min: 0, default: 0 },
    platformFeePercent: { type: Number, min: 0, default: 0 },
    platformFeeAmount: { type: Number, min: 0, default: 0 },
    gstPercent: { type: Number, min: 0, default: 0 },
    gstAmount: { type: Number, min: 0, default: 0 },
    price: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, default: "INR" },
    isPublished: { type: Boolean, default: false },
    thumbnailUrl: { type: String, default: "" },
    previewVideoUrl: { type: String, default: "" },
    downloadUrl: { type: String, default: "" },
    isArchived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

marketplaceSchema.index({ isPublished: 1, isArchived: 1, courseTag: 1, createdAt: -1 });
marketplaceSchema.index({ seller: 1, createdAt: -1 });

const marketplacePurchaseSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "MarketplaceItem", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    basePrice: { type: Number, required: true, min: 0, default: 0 },
    platformFeeAmount: { type: Number, required: true, min: 0, default: 0 },
    gstAmount: { type: Number, required: true, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    purchaseType: {
      type: String,
      enum: ["free-enroll", "paid-purchase", "monthly-subscription"],
      required: true
    },
    accessStartsAt: { type: Date, default: null },
    accessExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

marketplacePurchaseSchema.index({ item: 1, buyer: 1 }, { unique: true });
marketplacePurchaseSchema.index({ buyer: 1, createdAt: -1 });
marketplacePurchaseSchema.index({ seller: 1, createdAt: -1 });

export const MarketplaceItem = mongoose.model("MarketplaceItem", marketplaceSchema);
export const MarketplacePurchase = mongoose.model("MarketplacePurchase", marketplacePurchaseSchema);
