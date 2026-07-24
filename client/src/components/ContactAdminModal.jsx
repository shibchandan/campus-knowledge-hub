import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { apiClient } from "../lib/apiClient";

export function ContactAdminModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");

  useEffect(() => {
    if (user?.email) {
      setContactEmail(user.email);
    }
  }, [user?.email]);

  // Reset form when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setContactError("");
      setContactSuccess("");
      setContactSubject("");
      setContactMessage("");
    }
  }, [isOpen]);

  async function handleContactSubmit(event) {
    event.preventDefault();
    setContactSubmitting(true);
    setContactError("");
    setContactSuccess("");
    try {
      await apiClient.post("/auth/contact-admin", {
        email: contactEmail,
        subject: contactSubject,
        message: contactMessage
      });
      setContactSuccess("Your message has been sent to the administrators!");
      setContactSubject("");
      setContactMessage("");
      if (!user) {
        setContactEmail("");
      }
    } catch (err) {
      setContactError(err.response?.data?.message || "Failed to send message.");
    } finally {
      setContactSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: theme === "light" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      padding: "1rem"
    }}>
      <div className="section-card" style={{
        width: "100%",
        maxWidth: "500px",
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
        borderRadius: "16px",
        overflow: "hidden"
      }}>
        <div style={{
          padding: "1.5rem",
          borderBottom: "1px solid var(--glass-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-color)" }}>Contact Administrators</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-slate-400-adaptive)",
              cursor: "pointer",
              fontSize: "1.5rem",
              lineHeight: 1,
              padding: 0
            }}
            type="button"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleContactSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {contactError ? <p className="auth-error" style={{ margin: 0 }}>{contactError}</p> : null}
          {contactSuccess ? <p className="success-note" style={{ margin: 0 }}>{contactSuccess}</p> : null}
          
          <label className="auth-field">
            <span>Your Email Address</span>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={Boolean(user?.email)}
            />
          </label>
          
          <label className="auth-field">
            <span>Subject</span>
            <input
              type="text"
              value={contactSubject}
              onChange={(e) => setContactSubject(e.target.value)}
              placeholder="What is this regarding?"
              required
            />
          </label>
          
          <label className="auth-field">
            <span>Message</span>
            <textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Enter your message to the administration team..."
              required
              rows={4}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--glass-text-primary)",
                fontFamily: "inherit",
                resize: "none"
              }}
            />
          </label>
          
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button className="auth-submit" disabled={contactSubmitting} type="submit" style={{ flex: 1, margin: 0 }}>
              {contactSubmitting ? "Sending..." : "Send Message"}
            </button>
            <button
              className="action-button neutral"
              onClick={onClose}
              type="button"
              style={{ padding: "0 1.5rem" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
