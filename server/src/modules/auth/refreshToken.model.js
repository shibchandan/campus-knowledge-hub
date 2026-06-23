import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    token: { 
      type: String, 
      required: true, 
      unique: true 
    },
    familyId: { 
      type: String, 
      required: true,
      index: true
    },
    expiresAt: { 
      type: Date, 
      required: true 
    },
    isRevoked: { 
      type: Boolean, 
      default: false 
    }
  },
  { timestamps: true }
);

// TTL Index: Automatically delete refresh tokens once they naturally expire
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
