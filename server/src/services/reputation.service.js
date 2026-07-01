import { User } from "../modules/auth/auth.model.js";
import { createAuditLog } from "./audit.service.js";

/**
 * Award or deduct reputation points for a user.
 * 
 * @param {Object} params
 * @param {string} params.userId - The ID of the user receiving/losing points.
 * @param {number} params.points - Number of points to add (positive) or deduct (negative).
 * @param {string} params.reason - Description of why points were awarded/deducted (for audit log).
 * @param {Object} [params.req] - Optional Express request object for audit logging.
 */
export async function awardReputation({ userId, points, reason, req }) {
  if (!userId || points === 0) return;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { reputationScore: points } },
      { new: true }
    );

    if (user) {
      const action = points > 0 ? "reputation.awarded" : "reputation.deducted";
      await createAuditLog({
        req: req || { user: { id: "system", role: "system" }, ip: "system" }, // Fallback if no req is provided
        action,
        entityType: "user",
        entityId: userId,
        message: `${points > 0 ? '+' : ''}${points} points: ${reason}`
      });
    }
  } catch (error) {
    console.error(`[Reputation Service] Error updating reputation for user ${userId}:`, error);
  }
}
