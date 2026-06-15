import { CommunityGroup, CommunityMessage } from "./community.model.js";
import crypto from "crypto";

export async function createGroup(req, res, next) {
  try {
    const { name, description } = req.body;
    
    // Generate a random 8-character alphanumeric invite code
    const inviteCode = crypto.randomBytes(4).toString("hex");

    const group = await CommunityGroup.create({
      name,
      description,
      inviteCode,
      createdBy: req.user.id,
      members: [req.user.id] // Creator is automatically a member
    });

    res.status(201).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
}

export async function getGroups(req, res, next) {
  try {
    // Fetch all groups the user is a member of
    const groups = await CommunityGroup.find({ members: req.user.id })
      .populate("createdBy", "fullName")
      .sort("-createdAt");
      
    res.json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
}

export async function joinGroup(req, res, next) {
  try {
    const { inviteCode } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ success: false, message: "Invite code is required." });
    }

    const group = await CommunityGroup.findOne({ inviteCode });
    if (!group) {
      return res.status(404).json({ success: false, message: "Invalid invite code." });
    }

    if (!group.members.includes(req.user.id)) {
      if (group.members.length >= group.maxCapacity) {
        return res.status(403).json({ success: false, message: "This group has reached its maximum capacity." });
      }
      group.members.push(req.user.id);
      await group.save();
    }

    res.json({ success: true, message: "Joined group successfully", data: group });
  } catch (error) {
    next(error);
  }
}

export async function getMessages(req, res, next) {
  try {
    const { id: groupId } = req.params;

    const group = await CommunityGroup.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    // Enforce membership
    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: "Not a member of this group" });
    }

    const messages = await CommunityMessage.find({ groupId })
      .populate("sender", "fullName email")
      .sort("createdAt"); // ascending so oldest is top, newest bottom

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const { id: groupId } = req.params;
    const { text } = req.body;

    if (!text) return res.status(400).json({ success: false, message: "Message text is required" });

    const group = await CommunityGroup.findById(groupId);
    if (!group || !group.members.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized to send messages here" });
    }

    const message = await CommunityMessage.create({
      groupId,
      sender: req.user.id,
      text
    });

    const populatedMessage = await message.populate("sender", "fullName email");

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    next(error);
  }
}

export async function reactToMessage(req, res, next) {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body; // e.g., '👍'

    const message = await CommunityMessage.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    // Enforce membership on the group
    const group = await CommunityGroup.findById(message.groupId);
    if (!group || !group.members.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Toggle reaction
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    
    if (existingReaction) {
      const userIndex = existingReaction.users.indexOf(req.user.id);
      if (userIndex > -1) {
        // User already reacted with this emoji, remove it
        existingReaction.users.splice(userIndex, 1);
        // If no users left for this emoji, remove the emoji reaction entirely
        if (existingReaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        existingReaction.users.push(req.user.id);
      }
    } else {
      message.reactions.push({ emoji, users: [req.user.id] });
    }

    await message.save();
    
    const populatedMessage = await message.populate("sender", "fullName email");
    res.json({ success: true, data: populatedMessage });
  } catch (error) {
    next(error);
  }
}
