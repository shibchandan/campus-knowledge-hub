import { Router } from "express";
import {
  createMarketplaceItem,
  deleteMarketplaceItem,
  getMarketplaceItems,
  getMyMarketplaceItems,
  getMyPurchases,
  purchaseMarketplaceItem,
  updateMarketplaceItem
} from "./marketplace.controller.js";
import { protect } from "../../middleware/authMiddleware.js";

export const marketplaceRouter = Router();

marketplaceRouter.get("/", getMarketplaceItems);
marketplaceRouter.post("/", protect, createMarketplaceItem);
marketplaceRouter.get("/mine", protect, getMyMarketplaceItems);
marketplaceRouter.get("/purchases/me", protect, getMyPurchases);
marketplaceRouter.post("/:itemId/purchase", protect, purchaseMarketplaceItem);
marketplaceRouter.patch("/:itemId", protect, updateMarketplaceItem);
marketplaceRouter.delete("/:itemId", protect, deleteMarketplaceItem);
