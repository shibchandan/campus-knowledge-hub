import {
  createHttpError,
  readEnum,
  readMongoId,
  readPagination,
  readSearchPattern,
  readString
} from "../../utils/requestValidation.js";
import { MarketplaceItem, MarketplacePurchase } from "./marketplace.model.js";
import { env } from "../../config/env.js";
import { PaymentOrder } from "../payments/payment.model.js";
import {
  buildRazorpayCheckoutPayload,
  createRazorpayOrder,
  verifyRazorpaySignature
} from "../../services/payment.service.js";
import { createAuditLog } from "../../services/audit.service.js";

function normalizePrice(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw createHttpError("price must be a non-negative number.");
  }

  return Number(numeric.toFixed(2));
}

function normalizePercent(value, fallbackValue = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallbackValue;
  }

  return Number(numeric.toFixed(2));
}

function calculatePriceBreakdown(basePrice) {
  if (basePrice <= 0) {
    return {
      basePrice: 0,
      platformFeePercent: 0,
      platformFeeAmount: 0,
      gstPercent: 0,
      gstAmount: 0,
      totalPrice: 0
    };
  }

  const platformFeePercent = normalizePercent(env.marketplacePlatformFeePercent, 5);
  const gstPercent = normalizePercent(env.marketplaceGstPercent, 18);
  const platformFeeAmount = Number(((basePrice * platformFeePercent) / 100).toFixed(2));
  const taxableAmount = basePrice + platformFeeAmount;
  const gstAmount = Number(((taxableAmount * gstPercent) / 100).toFixed(2));
  const totalPrice = Number((basePrice + platformFeeAmount + gstAmount).toFixed(2));

  return {
    basePrice,
    platformFeePercent,
    platformFeeAmount,
    gstPercent,
    gstAmount,
    totalPrice
  };
}

function buildItemPayload(body) {
  const title = readString(body.title, { field: "title", min: 3, max: 160 });
  const description = readString(body.description, {
    field: "description",
    required: false,
    max: 1200
  });
  const resourceType = readEnum(body.resourceType || "course", {
    field: "resourceType",
    allowed: ["course", "notes", "pyq", "book", "bundle", "subscription"]
  });
  const basePrice = normalizePrice(body.price);
  const pricing = calculatePriceBreakdown(basePrice);
  const isPublished = String(body.isPublished || "false").trim().toLowerCase() === "true";
  const downloadUrl = readString(body.downloadUrl, { field: "downloadUrl", required: false, max: 500 });
  const thumbnailUrl = readString(body.thumbnailUrl, { field: "thumbnailUrl", required: false, max: 500 });
  const previewVideoUrl = readString(body.previewVideoUrl, {
    field: "previewVideoUrl",
    required: false,
    max: 500
  });
  const currency = readString(body.currency || "INR", { field: "currency", min: 3, max: 5 });
  const courseTag = pricing.totalPrice === 0 ? "free-course" : "paid-course";
  const isBasicSubscription = resourceType === "subscription";

  if (isBasicSubscription && pricing.totalPrice <= 0) {
    throw createHttpError("Monthly basic subscription must have a paid price.");
  }

  return {
    title,
    description,
    resourceType,
    subscriptionPlan: isBasicSubscription ? "basic" : "none",
    subscriptionDurationDays: isBasicSubscription
      ? Math.max(1, Number(env.marketplaceBasicSubscriptionDays || 30))
      : 0,
    basePrice: pricing.basePrice,
    platformFeePercent: pricing.platformFeePercent,
    platformFeeAmount: pricing.platformFeeAmount,
    gstPercent: pricing.gstPercent,
    gstAmount: pricing.gstAmount,
    price: pricing.totalPrice,
    courseTag,
    isPublished,
    currency: currency.toUpperCase(),
    downloadUrl,
    thumbnailUrl,
    previewVideoUrl
  };
}

function getMarketplacePurchaseType(item) {
  if (item.resourceType === "subscription") {
    return "monthly-subscription";
  }

  return Number(item.price || 0) > 0 ? "paid-purchase" : "free-enroll";
}

async function finalizeMarketplacePurchase({ item, buyerId }) {
  const amount = item.price > 0 ? item.price : 0;
  const purchaseType = getMarketplacePurchaseType(item);
  let purchase;

  if (purchaseType === "monthly-subscription") {
    const durationDays = Math.max(
      1,
      Number(item.subscriptionDurationDays || env.marketplaceBasicSubscriptionDays || 30)
    );
    const now = new Date();
    const existing = await MarketplacePurchase.findOne({ item: item._id, buyer: buyerId });
    const baseStart =
      existing?.accessExpiresAt && existing.accessExpiresAt > now ? existing.accessExpiresAt : now;
    const nextExpiry = new Date(baseStart.getTime() + durationDays * 24 * 60 * 60 * 1000);

    if (existing) {
      existing.seller = item.seller._id || item.seller;
      existing.basePrice = item.basePrice || 0;
      existing.platformFeeAmount = item.platformFeeAmount || 0;
      existing.gstAmount = item.gstAmount || 0;
      existing.amount = amount;
      existing.currency = item.currency;
      existing.purchaseType = purchaseType;
      existing.accessStartsAt = now;
      existing.accessExpiresAt = nextExpiry;
      await existing.save();
      purchase = existing;
    } else {
      purchase = await MarketplacePurchase.create({
        item: item._id,
        buyer: buyerId,
        seller: item.seller._id || item.seller,
        basePrice: item.basePrice || 0,
        platformFeeAmount: item.platformFeeAmount || 0,
        gstAmount: item.gstAmount || 0,
        amount,
        currency: item.currency,
        purchaseType,
        accessStartsAt: now,
        accessExpiresAt: nextExpiry
      });
    }
  } else {
    purchase = await MarketplacePurchase.findOneAndUpdate(
      { item: item._id, buyer: buyerId },
      {
        $setOnInsert: {
          seller: item.seller._id || item.seller,
          basePrice: item.basePrice || 0,
          platformFeeAmount: item.platformFeeAmount || 0,
          gstAmount: item.gstAmount || 0,
          amount,
          currency: item.currency,
          purchaseType
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return MarketplacePurchase.findById(purchase._id)
    .populate("buyer", "fullName email role")
    .populate("seller", "fullName email role")
    .populate(
      "item",
      "title courseTag basePrice platformFeePercent platformFeeAmount gstPercent gstAmount price currency resourceType subscriptionPlan subscriptionDurationDays isPublished downloadUrl"
    );
}

export async function createMarketplaceItem(req, res, next) {
  try {
    const payload = buildItemPayload(req.body);
    const item = await MarketplaceItem.create({
      ...payload,
      seller: req.user.id
    });

    const populated = await MarketplaceItem.findById(item._id).populate("seller", "fullName email role");
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
}

export async function updateMarketplaceItem(req, res, next) {
  try {
    const itemId = readMongoId(req.params.itemId, { field: "itemId" });
    const item = await MarketplaceItem.findById(itemId);

    if (!item || item.isArchived) {
      throw createHttpError("Marketplace item not found.", 404);
    }

    const isOwner = String(item.seller) === String(req.user.id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      throw createHttpError("You are not allowed to edit this item.", 403);
    }

    const payload = buildItemPayload(req.body);
    Object.assign(item, payload);
    await item.save();

    const populated = await MarketplaceItem.findById(item._id).populate("seller", "fullName email role");
    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
}

export async function deleteMarketplaceItem(req, res, next) {
  try {
    const itemId = readMongoId(req.params.itemId, { field: "itemId" });
    const item = await MarketplaceItem.findById(itemId);

    if (!item || item.isArchived) {
      throw createHttpError("Marketplace item not found.", 404);
    }

    const isOwner = String(item.seller) === String(req.user.id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      throw createHttpError("You are not allowed to delete this item.", 403);
    }

    item.isArchived = true;
    item.isPublished = false;
    await item.save();

    res.json({ success: true, message: "Marketplace item archived." });
  } catch (error) {
    next(error);
  }
}

export async function getMarketplaceItems(req, res, next) {
  try {
    const filters = { isArchived: false, isPublished: true };
    if (req.query.courseTag) {
      filters.courseTag = readEnum(req.query.courseTag, {
        field: "courseTag",
        allowed: ["free-course", "paid-course"]
      });
    }

    const pattern = readSearchPattern(req.query.search, { max: 100 });
    if (pattern) {
      filters.$or = [
        { title: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } }
      ];
    }

    const { limit, page, skip } = readPagination(req.query, { defaultLimit: 12, maxLimit: 50 });

    const [items, total] = await Promise.all([
      MarketplaceItem.find(filters)
        .populate("seller", "fullName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MarketplaceItem.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyMarketplaceItems(req, res, next) {
  try {
    const items = await MarketplaceItem.find({ seller: req.user.id, isArchived: false })
      .populate("seller", "fullName email role")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

export async function purchaseMarketplaceItem(req, res, next) {
  try {
    const itemId = readMongoId(req.params.itemId, { field: "itemId" });
    const item = await MarketplaceItem.findById(itemId).populate("seller", "fullName email role");

    if (!item || item.isArchived || !item.isPublished) {
      throw createHttpError("Course is not available.", 404);
    }

    if (String(item.seller._id) === String(req.user.id)) {
      throw createHttpError("You cannot buy your own course.");
    }

    const amount = item.price > 0 ? item.price : 0;
    const purchaseType = getMarketplacePurchaseType(item);

    if (purchaseType === "free-enroll") {
      const purchase = await finalizeMarketplacePurchase({
        item,
        buyerId: req.user.id
      });

      res.status(201).json({
        success: true,
        message: "Enrolled in free course.",
        data: purchase
      });
      return;
    }

    const gatewayOrder = await createRazorpayOrder({
      amount,
      currency: item.currency,
      receipt: `market-${item._id}-${Date.now()}`.slice(0, 40),
      notes: {
        itemId: String(item._id),
        buyerId: String(req.user.id),
        purchaseType
      }
    });

    const paymentOrder = await PaymentOrder.create({
      gateway: "razorpay",
      purpose:
        purchaseType === "monthly-subscription"
          ? "marketplace-subscription"
          : "marketplace-item",
      buyer: req.user.id,
      seller: item.seller._id,
      marketplaceItem: item._id,
      amount,
      currency: item.currency,
      gatewayOrderId: gatewayOrder.id,
      gatewayReceipt: gatewayOrder.receipt || "",
      metadata: {
        purchaseType
      }
    });

    res.status(201).json({
      success: true,
      paymentRequired: true,
      message:
        purchaseType === "monthly-subscription"
          ? "Complete payment to start your monthly basic subscription."
          : "Complete payment to unlock this marketplace item.",
      data: {
        paymentOrderId: paymentOrder._id,
        purchaseType,
        checkout: buildRazorpayCheckoutPayload({
          order: gatewayOrder,
          title: item.title,
          description:
            purchaseType === "monthly-subscription"
              ? "Monthly basic subscription"
              : "Marketplace course purchase",
          customer: req.user
        })
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyMarketplacePayment(req, res, next) {
  try {
    const itemId = readMongoId(req.params.itemId, { field: "itemId" });
    const paymentOrderId = readMongoId(req.body.paymentOrderId, { field: "paymentOrderId" });
    const razorpayOrderId = readString(req.body.razorpayOrderId, {
      field: "razorpayOrderId",
      min: 6,
      max: 120
    });
    const razorpayPaymentId = readString(req.body.razorpayPaymentId, {
      field: "razorpayPaymentId",
      min: 6,
      max: 120
    });
    const razorpaySignature = readString(req.body.razorpaySignature, {
      field: "razorpaySignature",
      min: 6,
      max: 200
    });

    const [item, paymentOrder] = await Promise.all([
      MarketplaceItem.findById(itemId).populate("seller", "fullName email role"),
      PaymentOrder.findById(paymentOrderId)
    ]);

    if (!item || item.isArchived || !item.isPublished) {
      throw createHttpError("Course is not available.", 404);
    }

    if (!paymentOrder) {
      throw createHttpError("Payment order not found.", 404);
    }

    if (String(paymentOrder.buyer) !== String(req.user.id)) {
      throw createHttpError("This payment order does not belong to your account.", 403);
    }

    if (String(paymentOrder.marketplaceItem) !== String(item._id)) {
      throw createHttpError("Payment order does not match this marketplace item.", 400);
    }

    if (paymentOrder.status === "verified") {
      const existingPurchase = await MarketplacePurchase.findOne({
        item: item._id,
        buyer: req.user.id
      })
        .populate("buyer", "fullName email role")
        .populate("seller", "fullName email role")
        .populate(
          "item",
          "title courseTag basePrice platformFeePercent platformFeeAmount gstPercent gstAmount price currency resourceType subscriptionPlan subscriptionDurationDays isPublished downloadUrl"
        );

      res.json({
        success: true,
        message: "Payment already verified for this purchase.",
        data: existingPurchase
      });
      return;
    }

    if (paymentOrder.status !== "created") {
      throw createHttpError("This payment order is not in a payable state.", 400);
    }

    if (paymentOrder.gatewayOrderId !== razorpayOrderId) {
      throw createHttpError("Gateway order mismatch for this payment.", 400);
    }

    const isSignatureValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature
    });

    if (!isSignatureValid) {
      paymentOrder.status = "failed";
      paymentOrder.gatewayPaymentId = razorpayPaymentId;
      paymentOrder.gatewaySignature = razorpaySignature;
      await paymentOrder.save();
      throw createHttpError("Payment signature verification failed.", 400);
    }

    paymentOrder.status = "verified";
    paymentOrder.gatewayPaymentId = razorpayPaymentId;
    paymentOrder.gatewaySignature = razorpaySignature;
    paymentOrder.verifiedAt = new Date();
    await paymentOrder.save();

    const purchase = await finalizeMarketplacePurchase({
      item,
      buyerId: req.user.id
    });

    await createAuditLog({
      req,
      action: "marketplace.verify_payment",
      entityType: "payment-order",
      entityId: paymentOrder._id,
      metadata: {
        marketplaceItem: item._id,
        purchaseType: paymentOrder.metadata?.purchaseType || getMarketplacePurchaseType(item),
        amount: paymentOrder.amount,
        currency: paymentOrder.currency
      }
    });

    res.json({
      success: true,
      message:
        paymentOrder.metadata?.purchaseType === "monthly-subscription"
          ? "Monthly basic subscription activated successfully."
          : "Marketplace purchase completed successfully.",
      data: purchase
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyPurchases(req, res, next) {
  try {
    const purchases = await MarketplacePurchase.find({ buyer: req.user.id })
      .populate("buyer", "fullName email role")
      .populate("seller", "fullName email role")
      .populate(
        "item",
        "title courseTag basePrice platformFeePercent platformFeeAmount gstPercent gstAmount price currency resourceType subscriptionPlan subscriptionDurationDays isPublished downloadUrl"
      )
      .sort({ createdAt: -1 });
    res.json({ success: true, data: purchases });
  } catch (error) {
    next(error);
  }
}
