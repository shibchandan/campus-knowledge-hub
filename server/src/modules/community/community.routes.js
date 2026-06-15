import { Router } from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { 
  createGroup, 
  getGroups, 
  joinGroup, 
  getMessages, 
  sendMessage, 
  reactToMessage 
} from "./community.controller.js";

export const communityRouter = Router();

// Group Management
communityRouter.post("/groups", protect, createGroup);
communityRouter.get("/groups", protect, getGroups);
communityRouter.post("/groups/join", protect, joinGroup);

// Messaging
communityRouter.get("/groups/:id/messages", protect, getMessages);
communityRouter.post("/groups/:id/messages", protect, sendMessage);
communityRouter.post("/messages/:id/react", protect, reactToMessage);
