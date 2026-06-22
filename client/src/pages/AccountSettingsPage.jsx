import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { useAuth } from "../auth/AuthContext";
import { apiClient, buildAuthorizedApiUrl } from "../lib/apiClient";
import { requestDeletePassword } from "../lib/deleteWithPassword";

const ACCOUNT_TABS = [
  { id: "general", label: "General" },
  { id: "notifications", label: "Notifications" },
  { id: "history", label: "History" },
  { id: "blocked", label: "Blocked Users" },
  { id: "guidelines", label: "Community Guidelines" },
  { id: "security", label: "Security" },
  { id: "billing", label: "Billing & Subscriptions" }
];

const defaultPreferences = {
  emailAnnouncements: true,
  noticeAlerts: true,
  quizReminders: true,
  aiHistoryVisible: true,
  darkModePreferred: true
};

export function AccountSettingsPage() {
  const { user, updateProfile, refreshCurrentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [showPasswordFields, setShowPasswordFields] = useState({
    current: false,
    next: false,
    confirm: false
  });
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    avatarUrl: user?.avatarUrl || ""
  });
  const [studentVerificationForm, setStudentVerificationForm] = useState({
    collegeName: user?.collegeName || "",
    collegeStudentId: user?.collegeStudentId || "",
    officialCollegeEmail: user?.officialCollegeEmail || ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedHistoryItems, setExpandedHistoryItems] = useState({});

  const toggleExpand = (id) => {
    setExpandedHistoryItems(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [blockedUserForm, setBlockedUserForm] = useState({
    label: "",
    email: "",
    reason: ""
  });
  const [collegeEmailOtp, setCollegeEmailOtp] = useState("");
  const [studentProofFile, setStudentProofFile] = useState(null);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationSubmitLoading, setVerificationSubmitLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [blockedUserSaving, setBlockedUserSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [setupData, setSetupData] = useState(null);
  const [setupCode, setSetupCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [migrationEmail, setMigrationEmail] = useState("");
  const [migrationLoading, setMigrationLoading] = useState(false);

  useEffect(() => {
    refreshCurrentUser().catch(() => {});
  }, [refreshCurrentUser]);

  useEffect(() => {
    setProfileForm({
      fullName: user?.fullName || "",
      avatarUrl: user?.avatarUrl || ""
    });
    setStudentVerificationForm({
      collegeName: user?.collegeName || "",
      collegeStudentId: user?.collegeStudentId || "",
      officialCollegeEmail: user?.officialCollegeEmail || ""
    });
  }, [user?.avatarUrl, user?.collegeName, user?.collegeStudentId, user?.fullName, user?.officialCollegeEmail]);

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      setSettingsLoading(true);
      try {
        const response = await apiClient.get("/settings/me");
        if (!ignore) {
          setPreferences({
            ...defaultPreferences,
            ...(response.data.data?.notificationPreferences || {})
          });
          setBlockedUsers(response.data.data?.blockedUsers || []);
        }
      } catch {
        if (!ignore) {
          setPreferences(defaultPreferences);
          setBlockedUsers([]);
        }
      } finally {
        if (!ignore) {
          setSettingsLoading(false);
        }
      }
    }

    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const response = await apiClient.get("/ai/history");
        if (!ignore) {
          setHistoryItems(response.data.data || []);
        }
      } catch {
        if (!ignore) {
          setHistoryItems([]);
        }
      } finally {
        if (!ignore) {
          setHistoryLoading(false);
        }
      }
    }

    loadSettings();
    loadHistory();

    return () => {
      ignore = true;
    };
  }, []);

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

  async function handleEnable2faInit() {
    setSetupLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiClient.post("/auth/2fa/setup");
      setSetupData(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to initialize 2FA setup.");
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleEnable2faVerify(event) {
    event.preventDefault();
    setSetupLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiClient.post("/auth/2fa/verify", { code: setupCode });
      setSuccess(response.data.message || "2FA enabled successfully.");
      setSetupData(null);
      setSetupCode("");
      await refreshCurrentUser();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Verification failed. Check the code.");
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleDisable2faSubmit(event) {
    event.preventDefault();
    setDisableLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiClient.post("/auth/2fa/disable", { password: disablePassword });
      setSuccess(response.data.message || "2FA disabled successfully.");
      setDisablePassword("");
      setShowDisableForm(false);
      await refreshCurrentUser();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to disable 2FA. Correct password required.");
    } finally {
      setDisableLoading(false);
    }
  }

  function togglePasswordField(field) {
    setShowPasswordFields((current) => ({
      ...current,
      [field]: !current[field]
    }));
  }

  async function togglePreference(key) {
    const nextValue = !preferences[key];
    setPreferencesSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient.patch("/settings/preferences", {
        [key]: nextValue
      });
      setPreferences({
        ...defaultPreferences,
        ...(response.data.data?.notificationPreferences || {})
      });
      setSuccess(response.data.message || "Preference updated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update preference.");
    } finally {
      setPreferencesSaving(false);
    }
  }

  async function handleAddBlockedUser(event) {
    event.preventDefault();
    setBlockedUserSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient.post("/settings/blocked-users", blockedUserForm);
      setBlockedUsers((current) => [...current, response.data.data]);
      setBlockedUserForm({
        label: "",
        email: "",
        reason: ""
      });
      setSuccess(response.data.message || "Blocked user added successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to add blocked user.");
    } finally {
      setBlockedUserSaving(false);
    }
  }

  async function handleRemoveBlockedUser(blockedUserId) {
    const currentPassword = requestDeletePassword("this blocked user entry");
    if (!currentPassword) {
      return;
    }
    setBlockedUserSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient.delete(`/settings/blocked-users/${blockedUserId}`, {
        data: { currentPassword }
      });
      setBlockedUsers(response.data.data?.blockedUsers || []);
      setSuccess(response.data.message || "Blocked user removed successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to remove blocked user.");
    } finally {
      setBlockedUserSaving(false);
    }
  }

  async function handleSendCollegeEmailOtp() {
    setVerificationBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient.post("/auth/student-verification/send-college-email-otp");
      setSuccess(response.data.message || "College email OTP sent.");
      await refreshCurrentUser();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to send college email OTP.");
    } finally {
      setVerificationBusy(false);
    }
  }

  async function handleVerifyCollegeEmailOtp(event) {
    event.preventDefault();
    setVerificationBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient.post("/auth/student-verification/verify-college-email-otp", {
        otp: collegeEmailOtp
      });
      setSuccess(response.data.message || "College email verified successfully.");
      setCollegeEmailOtp("");
      await refreshCurrentUser();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to verify college email OTP.");
    } finally {
      setVerificationBusy(false);
    }
  }

  async function handleStudentVerificationSubmit(event) {
    event.preventDefault();
    setVerificationSubmitLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = new FormData();
      payload.append("collegeName", studentVerificationForm.collegeName);
      payload.append("collegeStudentId", studentVerificationForm.collegeStudentId);
      payload.append("officialCollegeEmail", studentVerificationForm.officialCollegeEmail);

      if (studentProofFile) {
        payload.append("studentProof", studentProofFile);
      }

      const response = await apiClient.post("/auth/student-verification/submit", payload, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setSuccess(response.data.message || "Student verification submitted successfully.");
      setStudentProofFile(null);
      await refreshCurrentUser();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to submit student verification.");
    } finally {
      setVerificationSubmitLoading(false);
    }
  }

  async function handleRequestEmailMigration(event) {
    event.preventDefault();
    setMigrationLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient.post("/settings/request-email-migration", {
        newEmail: migrationEmail
      });
      setSuccess(response.data.message || "Email migration requested successfully.");
      setMigrationEmail("");
      await refreshCurrentUser();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to request email migration.");
    } finally {
      setMigrationLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <SectionCard
        title="Settings Center"
        description="Manage your profile, preferences, history visibility, safety controls, and platform guidance from one place."
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
              <p className="muted">
                {user?.role || "user"} account | {user?.collegeName || "College not assigned"}
              </p>
            </div>
          </div>

          <div className="account-settings-tabs">
            {ACCOUNT_TABS.map((tab) => (
              <button
                className={`account-settings-tab${activeTab === tab.id ? " active" : ""}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {activeTab === "general" ? (
        <SectionCard
          title="General Settings"
          description="Update your profile identity and see your account-level summary."
        >
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
              <h3>Assigned College</h3>
              <p>{user?.collegeName || "Admin has not assigned a college yet"}</p>
            </article>
            <article className="detail-card">
              <h3>College ID</h3>
              <p>{user?.collegeStudentId || "Not submitted yet"}</p>
            </article>
            <article className="detail-card">
              <h3>Student Verification</h3>
              <p>{user?.studentVerificationStatus || "none"}</p>
            </article>
            <article className="detail-card">
              <h3>Official College Email</h3>
              <p>
                {user?.officialCollegeEmail || "Not added"}{" "}
                {user?.officialCollegeEmailVerified ? "(Verified)" : "(Not verified)"}
              </p>
            </article>
            <article className="detail-card">
              <h3>Avatar Mode</h3>
              <p>{profileForm.avatarUrl ? "External avatar URL" : "Initials fallback"}</p>
            </article>
          </div>

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
              Leave the avatar URL empty if you prefer the platform to show your initials.
            </p>
            <button className="auth-submit" disabled={profileLoading} type="submit">
              {profileLoading ? "Saving..." : "Save General Settings"}
            </button>
          </form>

          {user?.role === "student" ? (
            <div className="panel-subsection">
              <h3>Student Verification</h3>
              <p className="muted">
                Your college-locked modules open after admin verifies your college ID and proof. Official college email verification adds extra confidence.
              </p>
              <form className="panel-form" onSubmit={handleStudentVerificationSubmit}>
                <div className="panel-form-grid">
                  <label className="auth-field">
                    <span>College Name</span>
                    <input
                      onChange={(event) =>
                        setStudentVerificationForm((current) => ({
                          ...current,
                          collegeName: event.target.value
                        }))
                      }
                      placeholder="Enter your college name"
                      required
                      type="text"
                      value={studentVerificationForm.collegeName}
                    />
                  </label>
                  <label className="auth-field">
                    <span>College Student ID</span>
                    <input
                      onChange={(event) =>
                        setStudentVerificationForm((current) => ({
                          ...current,
                          collegeStudentId: event.target.value
                        }))
                      }
                      placeholder="Enter your college ID"
                      required
                      type="text"
                      value={studentVerificationForm.collegeStudentId}
                    />
                  </label>
                  <label className="auth-field">
                    <span>Official College Email (optional)</span>
                    <input
                      onChange={(event) =>
                        setStudentVerificationForm((current) => ({
                          ...current,
                          officialCollegeEmail: event.target.value
                        }))
                      }
                      placeholder="name@college.edu"
                      type="email"
                      value={studentVerificationForm.officialCollegeEmail}
                    />
                  </label>
                  <label className="auth-field">
                    <span>Student Proof Document</span>
                    <input
                      accept="image/*,.pdf"
                      onChange={(event) => setStudentProofFile(event.target.files?.[0] || null)}
                      type="file"
                    />
                  </label>
                </div>
                <p className="muted">
                  Upload a college ID card, bonafide certificate, fee receipt, or admission proof. PDF and image files are supported.
                </p>
                <button className="auth-submit" disabled={verificationSubmitLoading} type="submit">
                  {verificationSubmitLoading
                    ? "Submitting..."
                    : user?.studentVerificationStatus === "pending"
                      ? "Resubmit Student Verification"
                      : "Submit Student Verification"}
                </button>
              </form>
              <div className="detail-grid">
                <article className="detail-card">
                  <h3>Proof Document</h3>
                  {user?.studentProofUrl ? (
                    <a href={buildAuthorizedApiUrl(user.studentProofUrl)} rel="noreferrer" target="_blank">
                      Open {user.studentProofOriginalName || "proof document"}
                    </a>
                  ) : (
                    <p>No proof document saved.</p>
                  )}
                </article>
                <article className="detail-card">
                  <h3>Official Email Status</h3>
                  <p>{user?.officialCollegeEmailVerified ? "Verified" : "Pending verification"}</p>
                </article>
              </div>

              {user?.officialCollegeEmail && !user?.officialCollegeEmailVerified ? (
                <>
                  <div className="panel-actions">
                    <button
                      className="action-button approve"
                      disabled={verificationBusy}
                      onClick={handleSendCollegeEmailOtp}
                      type="button"
                    >
                      {verificationBusy ? "Sending..." : "Send College Email OTP"}
                    </button>
                  </div>
                  <form className="panel-form" onSubmit={handleVerifyCollegeEmailOtp}>
                    <label className="auth-field">
                      <span>College Email OTP</span>
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        minLength={6}
                        onChange={(event) => setCollegeEmailOtp(event.target.value)}
                        placeholder="6-digit OTP"
                        required
                        type="text"
                        value={collegeEmailOtp}
                      />
                    </label>
                    <button className="auth-submit" disabled={verificationBusy} type="submit">
                      {verificationBusy ? "Verifying..." : "Verify College Email"}
                    </button>
                  </form>
                </>
              ) : null}
            </div>
          ) : null}

          {user?.role === "representative" ? (
            <div className="panel-subsection">
              <h3>Email Migration Request</h3>
              <p className="muted">
                As a representative, you can request to transfer your account to a new email address. This requires Admin approval.
              </p>
              
              {user?.pendingEmailMigrationStatus === "pending" ? (
                <div className="detail-grid">
                  <article className="detail-card">
                    <h3>Pending Migration</h3>
                    <p>You have requested to migrate this account to <strong>{user?.pendingEmailMigration}</strong>. Waiting for admin approval.</p>
                  </article>
                </div>
              ) : (
                <form className="panel-form" onSubmit={handleRequestEmailMigration}>
                  <div className="panel-form-grid">
                    <label className="auth-field">
                      <span>New Email Address</span>
                      <input
                        onChange={(event) => setMigrationEmail(event.target.value)}
                        placeholder="new.email@college.edu"
                        required
                        type="email"
                        value={migrationEmail}
                      />
                    </label>
                  </div>
                  <button className="auth-submit" disabled={migrationLoading} type="submit">
                    {migrationLoading ? "Requesting..." : "Request Email Migration"}
                  </button>
                </form>
              )}
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {activeTab === "notifications" ? (
        <SectionCard
          title="Notification Bar"
          description="Choose what kind of reminders and update alerts you want to keep active."
        >
          <div className="panel-list">
            {[
              {
                key: "emailAnnouncements",
                title: "Email Announcements",
                note: "Receive important platform announcements in email."
              },
              {
                key: "noticeAlerts",
                title: "Notice Alerts",
                note: "Get notified when your selected college publishes a notice."
              },
              {
                key: "quizReminders",
                title: "Quiz Reminders",
                note: "Receive reminders for representative-published quiz updates."
              },
              {
                key: "darkModePreferred",
                title: "Theme Preference Sync",
                note: "Remember your preferred account view styling locally."
              }
            ].map((item) => (
              <article className="panel-card" key={item.key}>
                <h3>{item.title}</h3>
                <p className="muted">{item.note}</p>
                <div className="panel-actions">
                  <button
                    className={preferences[item.key] ? "action-button approve" : "action-button neutral"}
                    disabled={settingsLoading || preferencesSaving}
                    onClick={() => togglePreference(item.key)}
                    type="button"
                  >
                    {preferencesSaving ? "Saving..." : preferences[item.key] ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {activeTab === "history" ? (
        <SectionCard
          title="History"
          description="Review your AI activity and history visibility preference from one place."
        >
          <div className="detail-grid">
            <article className="detail-card">
              <h3>AI History Visibility</h3>
              <p>{preferences.aiHistoryVisible ? "Visible in your account" : "Hidden in your account view"}</p>
            </article>
            <article className="detail-card">
              <h3>Entries Loaded</h3>
              <p>{historyLoading ? "Loading..." : historyItems.length}</p>
            </article>
          </div>
          <div className="panel-actions">
            <button
              className={preferences.aiHistoryVisible ? "action-button approve" : "action-button neutral"}
              onClick={() => togglePreference("aiHistoryVisible")}
              type="button"
            >
              {preferences.aiHistoryVisible ? "Hide History Section" : "Show History Section"}
            </button>
          </div>
          {preferences.aiHistoryVisible ? (
            <div className="panel-list">
              {historyLoading ? <p className="muted">Loading account history...</p> : null}
              {!historyLoading && !historyItems.length ? (
                <p className="muted">No AI history found yet for this account.</p>
              ) : null}
              {historyItems.slice(0, 8).map((item) => (
                <article className="panel-card" key={item._id}>
                  <h3>{item.question}</h3>
                  <p className="muted">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p 
                    className="summary-text" 
                    title={expandedHistoryItems[item._id] ? "Click to collapse" : "Click to expand"}
                    style={{ cursor: "pointer", ...(expandedHistoryItems[item._id] ? { WebkitLineClamp: "unset", display: "block" } : {}) }}
                    onClick={() => toggleExpand(item._id)}
                  >
                    {item.answer?.summary || (typeof item.answer === "string" ? item.answer : "No answer saved.")}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {activeTab === "blocked" ? (
        <SectionCard
          title="Blocked Users"
          description="Keep track of muted or blocked community contacts and manage your list."
        >
          <form className="panel-form" onSubmit={handleAddBlockedUser}>
            <div className="panel-form-grid">
              <label className="auth-field">
                <span>Label</span>
                <input
                  onChange={(event) =>
                    setBlockedUserForm((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Name or label"
                  required
                  type="text"
                  value={blockedUserForm.label}
                />
              </label>
              <label className="auth-field">
                <span>Email (optional)</span>
                <input
                  onChange={(event) =>
                    setBlockedUserForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="user@example.com"
                  type="email"
                  value={blockedUserForm.email}
                />
              </label>
              <label className="auth-field">
                <span>Reason (optional)</span>
                <input
                  onChange={(event) =>
                    setBlockedUserForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Why you blocked this person"
                  type="text"
                  value={blockedUserForm.reason}
                />
              </label>
            </div>
            <button className="auth-submit" disabled={blockedUserSaving} type="submit">
              {blockedUserSaving ? "Saving..." : "Add Blocked User"}
            </button>
          </form>
          {!blockedUsers.length ? (
            <p className="muted">You have not blocked any community users.</p>
          ) : null}
          <div className="panel-list">
            {blockedUsers.map((item) => (
              <article className="panel-card" key={item._id}>
                <h3>{item.label}</h3>
                <p className="muted">{item.email || "No email saved"}</p>
                <p className="muted">{item.reason || "No reason added"}</p>
                <div className="panel-actions">
                  <button
                    className="action-button neutral"
                    disabled={blockedUserSaving}
                    onClick={() => handleRemoveBlockedUser(item._id)}
                    type="button"
                  >
                    {blockedUserSaving ? "Removing..." : "Remove Block"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {activeTab === "guidelines" ? (
        <SectionCard
          title="Community Guidelines"
          description="Platform rules for respectful academic collaboration and safe content sharing."
        >
          <div className="detail-grid">
            {[
              "Share academic content only if it is original, permitted, or properly attributed.",
              "Do not spam discussions, comments, or doubt threads with repeated promotions.",
              "Avoid harassment, impersonation, or posting private personal details of students or faculty.",
              "Upload quizzes, notes, and notices only under the correct college/course context.",
              "Report plagiarism, unsafe content, or misuse through admin moderation channels."
            ].map((rule) => (
              <article className="detail-card" key={rule}>
                <p>{rule}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {activeTab === "security" ? (
        <>
          <SectionCard
            title="Security"
            description="Change your password and review the account protection reminders for this profile."
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
              <article className="detail-card">
                <h3>Recovery Reminder</h3>
                <p>Keep access to your registered email because OTP reset uses that mailbox.</p>
              </article>
            </div>

            <button className="auth-submit" disabled={passwordLoading} type="submit">
              {passwordLoading ? "Updating..." : "Change Password"}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Two-Factor Authentication (2FA)"
          description="Protect your account with an extra security step. If enabled, you must authenticate using your device."
        >
          {user?.twoFactorEnabled ? (
            <div className="two-factor-settings-enabled">
              <div className="status-banner success" style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "8px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <p style={{ color: "var(--color-emerald-500-adaptive, #059669)", fontWeight: "600" }}>✓ Two-Factor Authentication is currently Active</p>
                <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                  Your account requires a code from your authenticator app when logging in.
                </p>
              </div>

              {showDisableForm ? (
                <form className="panel-form" onSubmit={handleDisable2faSubmit}>
                  <label className="auth-field">
                    <span>Enter Current Password</span>
                    <input
                      onChange={(event) => setDisablePassword(event.target.value)}
                      placeholder="Confirm your password to disable 2FA"
                      required
                      type="password"
                      value={disablePassword}
                    />
                  </label>
                  <div className="button-group" style={{ display: "flex", gap: "1rem" }}>
                    <button className="auth-submit danger" disabled={disableLoading} type="submit" style={{ background: "#ef4444" }}>
                      {disableLoading ? "Disabling..." : "Confirm Disable"}
                    </button>
                    <button
                      className="action-button neutral"
                      onClick={() => {
                        setShowDisableForm(false);
                        setDisablePassword("");
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  className="auth-submit danger"
                  onClick={() => setShowDisableForm(true)}
                  type="button"
                  style={{ background: "#ef4444" }}
                >
                  Disable Two-Factor Authentication
                </button>
              )}
            </div>
          ) : (
            <div className="two-factor-settings-disabled">
              {!setupData ? (
                <button
                  className="auth-submit"
                  disabled={setupLoading}
                  onClick={handleEnable2faInit}
                  type="button"
                >
                  {setupLoading ? "Initializing..." : "Enable Two-Factor Authentication"}
                </button>
              ) : (
                <div className="two-factor-setup-flow">
                  <p className="muted" style={{ marginBottom: "1.5rem" }}>
                    Scan the QR code below using your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.) to set up 2FA.
                  </p>
                  
                  <div className="qr-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "1.5rem", borderRadius: "12px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", maxWidth: "300px", margin: "0 auto 1.5rem auto" }}>
                    <img
                      alt="2FA QR Code"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpauthUrl)}`}
                      style={{ borderRadius: "8px", background: "white", padding: "8px" }}
                    />
                    <div style={{ textAlign: "center" }}>
                      <p className="muted" style={{ fontSize: "0.75rem" }}>Can't scan the code? Enter this key manually:</p>
                      <code style={{ background: "rgba(0, 0, 0, 0.2)", padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.875rem", color: "#f59e0b", letterSpacing: "1px", wordBreak: "break-all" }}>{setupData.secret}</code>
                    </div>
                  </div>

                  <form className="panel-form" onSubmit={handleEnable2faVerify}>
                    <label className="auth-field">
                      <span>Enter 6-Digit Authentication Code</span>
                      <input
                        maxLength={6}
                        minLength={6}
                        onChange={(event) => setSetupCode(event.target.value)}
                        placeholder="6-digit code"
                        required
                        type="text"
                        value={setupCode}
                      />
                    </label>
                    <div className="button-group" style={{ display: "flex", gap: "1rem" }}>
                      <button className="auth-submit" disabled={setupLoading} type="submit">
                        {setupLoading ? "Enabling..." : "Verify & Enable"}
                      </button>
                      <button
                        className="action-button neutral"
                        onClick={() => {
                          setSetupData(null);
                          setSetupCode("");
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Data Deletion"
          description="Request to have all your personal data permanently removed from our platform. This action is irreversible."
        >
          <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", padding: "1.5rem" }}>
            <h3 style={{ color: "#ef4444", fontSize: "1rem", margin: "0 0 0.5rem 0" }}>Right to be Forgotten</h3>
            <p style={{ color: "var(--color-red-400-adaptive, #ef4444)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              In compliance with data protection laws, you can request full deletion of your account and associated personal data. 
              Once processed, you will lose access to all your notes, lectures, and academic records.
            </p>
            <button
              onClick={() => {
                const conf = window.confirm("Are you sure you want to request data deletion? This will send a request to the admin.");
                if (conf) {
                  // Reusing the delete with password modal to enforce security
                  const pwd = requestDeletePassword("your account and all associated data");
                  if (pwd) {
                    apiClient.post("/auth/contact-admin", {
                      email: user?.email,
                      subject: "URGENT: Data Deletion Request",
                      message: `I verify my password was entered correctly. Please permanently delete my account and all associated data for user ID: ${user?._id}`
                    })
                    .then(() => alert("Your data deletion request has been securely verified and submitted to the admins."))
                    .catch(() => alert("Failed to submit request. Please try again or contact support."));
                  }
                }
              }}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "0.875rem"
              }}
              type="button"
            >
              Request Data Deletion
            </button>
          </div>
        </SectionCard>
        </>
      ) : null}

      {activeTab === "billing" ? (
        <SectionCard
          title="Billing & Subscriptions"
          description="Manage your payment methods, view invoices, and cancel your active subscriptions."
        >
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", color: "#f8fafc" }}>Current Plan: Free Tier</h3>
                <p style={{ margin: 0, color: "var(--color-slate-400-adaptive)", fontSize: "0.875rem" }}>You do not have any active paid subscriptions.</p>
              </div>
              <button
                disabled
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "rgba(255, 255, 255, 0.3)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  fontWeight: "500",
                  cursor: "not-allowed",
                  fontSize: "0.875rem"
                }}
                title="No active subscription to cancel"
              >
                Cancel Subscription
              </button>
            </div>
            <div style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "1rem" }}>
              <p style={{ color: "var(--color-slate-400-adaptive)", fontSize: "0.875rem", margin: 0 }}>
                When you subscribe to a paid plan in the future, you will be able to manage your billing cycle and cancel easily from this panel with one click.
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
