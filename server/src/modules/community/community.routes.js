import { Router } from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { 
  createGroup, 
  getGroups, 
  joinGroup, 
  getMessages, 
  sendMessage, 
  reactToMessage,
  getGroupMembers,
  leaveGroup,
  deleteGroup,
  transferAdmin,
  toggleMessagingRestriction
} from "./community.controller.js";

export const communityRouter = Router();

// Group Management
communityRouter.post("/groups", protect, createGroup);
communityRouter.get("/groups", protect, getGroups);
communityRouter.post("/groups/join", protect, joinGroup);
communityRouter.get("/groups/:id/members", protect, getGroupMembers);
communityRouter.post("/groups/:id/leave", protect, leaveGroup);
communityRouter.delete("/groups/:id", protect, deleteGroup);
communityRouter.put("/groups/:id/transfer", protect, transferAdmin);
communityRouter.put("/groups/:id/restrict", protect, toggleMessagingRestriction);

// Messaging
communityRouter.get("/groups/:id/messages", protect, getMessages);
communityRouter.post("/groups/:id/messages", protect, sendMessage);
communityRouter.post("/messages/:id/react", protect, reactToMessage);
