import { useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { useAuth } from "../auth/AuthContext";
import { apiClient } from "../lib/apiClient";

export function AccountSettingsPage() {
  const { user, updateProfile } = useAuth();
  const [showPasswordFields, setShowPasswordFields] = useState({
    current: false,
    next: false,
    confirm: false
  });
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    avatarUrl: user?.avatarUrl || ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const initials = useMemo(() => {
    if (!user?.fullName) {
      return "U";
    }

    return user.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [user?.fullName]);

  const passwordStrength =
    passwordForm.newPassword.length >= 10
      ? "Strong"
      : passwordForm.newPassword.length >= 6
        ? "Good"
        : passwordForm.newPassword.length
          ? "Too short"
          : "Add a new password";

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileLoading(true);
    setError("");
    setSuccess("");

    try {
      await updateProfile(profileForm);
      setSuccess("Profile updated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordLoading(true);
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirm password must match.");
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await apiClient.post("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setSuccess(response.data.message || "Password changed successfully.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  }

  function togglePasswordField(field) {
    setShowPasswordFields((current) => ({
      ...current,
      [field]: !current[field]
    }));
  }

  return (
    <div className="page-stack">
      <SectionCard
        title="Account Snapshot"
        description="Quickly review your profile identity, role, and account state before making changes."
      >
        {error ? <p className="auth-error">{error}</p> : null}
        {success ? <p className="success-note">{success}</p> : null}
        <div className="account-summary">
          <div className="account-summary-card">
            {profileForm.avatarUrl ? (
              <img
                alt={`${profileForm.fullName || user?.fullName || "User"} avatar`}
                className="account-avatar account-avatar-image"
                src={profileForm.avatarUrl}
              />
            ) : (
              <div className="account-avatar" aria-hidden="true">
                {initials}
              </div>
            )}
            <div className="account-summary-copy">
              <h3>{user?.fullName || "Campus user"}</h3>
              <p className="muted">{user?.email || "No email available"}</p>
            </div>
          </div>

          <div className="detail-grid">
            <article className="detail-card">
              <h3>Role</h3>
              <p>{user?.role || "Not assigned"}</p>
            </article>
            <article className="detail-card">
              <h3>Account Status</h3>
              <p>{user?.status || "Active"}</p>
            </article>
            <article className="detail-card">
              <h3>Avatar Mode</h3>
              <p>{profileForm.avatarUrl ? "External avatar URL" : "Initials fallback"}</p>
            </article>
            <article className="detail-card">
              <h3>Security Reminder</h3>
              <p>Use a unique password and keep your recovery email secure.</p>
            </article>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Profile Settings"
        description="Update your public identity details without touching your sign-in email."
      >
        <form className="panel-form" onSubmit={handleProfileSubmit}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>Full Name</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, fullName: event.target.value }))
                }
                required
                type="text"
                value={profileForm.fullName}
              />
            </label>
            <label className="auth-field">
              <span>Avatar URL</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, avatarUrl: event.target.value }))
                }
                placeholder="https://example.com/profile.jpg"
                type="url"
                value={profileForm.avatarUrl}
              />
            </label>
          </div>
          <p className="muted">
            Leave the avatar URL empty if you prefer the platform to show your initials in the header.
          </p>
          <button className="auth-submit" disabled={profileLoading} type="submit">
            {profileLoading ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Change Password"
        description="Enter your current password first. New password should be stronger than your previous one."
      >
        <form className="panel-form" onSubmit={handlePasswordSubmit}>
          <label className="auth-field">
            <span>Current Password</span>
            <div className="inline-field">
              <input
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value
                  }))
                }
                required
                type={showPasswordFields.current ? "text" : "password"}
                value={passwordForm.currentPassword}
              />
              <button
                className="field-toggle"
                onClick={() => togglePasswordField("current")}
                type="button"
              >
                {showPasswordFields.current ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <label className="auth-field">
            <span>New Password</span>
            <div className="inline-field">
              <input
                minLength={6}
                onChange={(event) =>
                  setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                }
                required
                type={showPasswordFields.next ? "text" : "password"}
                value={passwordForm.newPassword}
              />
              <button
                className="field-toggle"
                onClick={() => togglePasswordField("next")}
                type="button"
              >
                {showPasswordFields.next ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <label className="auth-field">
            <span>Confirm New Password</span>
            <div className="inline-field">
              <input
                minLength={6}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value
                  }))
                }
                required
                type={showPasswordFields.confirm ? "text" : "password"}
                value={passwordForm.confirmPassword}
              />
              <button
                className="field-toggle"
                onClick={() => togglePasswordField("confirm")}
                type="button"
              >
                {showPasswordFields.confirm ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <div className="detail-grid">
            <article className="detail-card">
              <h3>Password Strength</h3>
              <p>{passwordStrength}</p>
            </article>
            <article className="detail-card">
              <h3>Recommended Practice</h3>
              <p>Use 10 or more characters with a mix of words, numbers, and symbols.</p>
            </article>
          </div>

          <button className="auth-submit" disabled={passwordLoading} type="submit">
            {passwordLoading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
