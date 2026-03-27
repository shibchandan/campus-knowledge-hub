import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    actorEmail: { type: String, default: "", trim: true },
    actorRole: { type: String, default: "", trim: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, default: "", trim: true },
    status: { type: String, enum: ["success", "failure"], default: "success" },
    message: { type: String, default: "", trim: true },
    metadata: { type: Object, default: {} },
    ipAddress: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

auditLogSchema.index({ actorUserId: 1, createdAt: -1 }, { name: "idx_audit_actor_created" });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 }, { name: "idx_audit_entity_created" });
auditLogSchema.index({ action: 1, createdAt: -1 }, { name: "idx_audit_action_created" });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
