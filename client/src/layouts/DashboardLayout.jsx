import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { useAuth } from "../auth/AuthContext";
import { useCollege } from "../college/CollegeContext";
import { useTheme } from "../theme/ThemeContext";
import { apiClient } from "../lib/apiClient";
import { GlobalSearch } from "../components/GlobalSearch";

const navSections = [
  {
    label: "Main",
    links: [
      { to: "/colleges", label: "Colleges", icon: "🏛️" },
      { to: "/panel", label: "Panel", icon: "⚙️" },
      { to: "/account", label: "Account", icon: "👤" }
    ]
  },
  {
    label: "Academic",
    links: [
      { to: "/dashboard", label: "Overview", icon: "📊" },
      { to: "/lectures", label: "Lectures", icon: "🎬" },
      { to: "/notes", label: "Notes & PYQs", icon: "📝" },
      { to: "/quizzes", label: "Quizzes", icon: "✅" },
      { to: "/assignments", label: "Live Assignments", icon: "⏳" }
    ]
  },
  {
    label: "Tools",
    links: [
      { to: "/ai-studio", label: "AI Studio", icon: "🤖" },
      { to: "/integrity", label: "Integrity", icon: "🛡️" },
      { to: "/marketplace", label: "Marketplace", icon: "🛒" },
      { to: "/community", label: "Community", icon: "💬" }
    ]
  }
];

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { selectedCollege } = useCollege();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isContactOpen, setIsContactOpen] = useState(false);
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

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "G";

  return (
    <div className={isSidebarOpen ? "shell sidebar-open" : "shell"}>
      {isSidebarOpen ? (
        <button
          aria-label="Close menu overlay"
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      ) : null}

      <aside className="sidebar">
        <button
          aria-label="Close navigation menu"
          className="sidebar-close-button"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        >
          Close
        </button>

        <div className="sidebar-brand-section">
          <div className="sidebar-brand-row">
            <div className="sidebar-logo-box">
              <img src="/logo.png" alt="Campus Knowledge Hub" className="sidebar-main-logo" />
            </div>
            <div className="sidebar-brand-text">
              <p className="eyebrow">Campus Knowledge Hub</p>
              <h2>Control Center</h2>
            </div>
          </div>
          <p className="muted sidebar-brand-desc">
            College-managed learning operations with lectures, resources, AI study help, and governed academic workflows.
          </p>
        </div>

        <nav className="nav">
          {navSections.map((section) => (
            <div className="nav-section" key={section.label}>
              <p className="nav-section-label">{section.label}</p>
              {section.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                >
                  <span className="nav-link-icon">{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="sidebar-user-avatar-img" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="sidebar-user-details">
              <p className="sidebar-user-name">{user?.fullName || "Guest User"}</p>
              <p className="sidebar-user-role">{user?.role || "Visitor"}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="content">
        <div className="topbar">
          <button
            aria-label="Open navigation menu"
            className="mobile-menu-button"
            onClick={() => setIsSidebarOpen(true)}
            type="button"
          >
            Menu
          </button>

          <div className="college-chip">
            <p className="college-label">College</p>
            <h3>{selectedCollege?.name || "Select College From Colleges Page"}</h3>
          </div>

          <div className="user-chip">
            {user?.avatarUrl ? (
              <img
                alt={`${user.fullName} profile`}
                className="user-logo user-logo-image"
                src={user.avatarUrl}
              />
            ) : (
              <div className="user-logo" aria-hidden="true">
                {initials}
              </div>
            )}
            <div>
              <p className="user-name">{user?.fullName || "Guest User"}</p>
              <p className="muted">{user?.email || "Browse Mode"}</p>
              <p className="topbar-meta">{user?.role || "visitor"} account</p>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="action-button neutral"
              onClick={() => window.dispatchEvent(new Event('open-global-search'))}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "var(--color-slate-400-adaptive)", fontSize: "0.875rem" }}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Search
              <kbd style={{ marginLeft: "8px", fontSize: "0.7rem", background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: "4px" }}>⌘K</kbd>
            </button>

            <button className="theme-button" onClick={toggleTheme} type="button">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>

            {user ? (
              <button className="logout-button" onClick={logout} type="button">
                Logout
              </button>
            ) : (
              <button className="logout-button" onClick={() => navigate("/login")} type="button">
                Sign In
              </button>
            )}
          </div>
        </div>
        <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
        
        <footer style={{
          padding: "2rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          borderTop: "1px solid var(--glass-border)",
          background: "transparent"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <p style={{ margin: 0, color: "var(--color-slate-400-adaptive)", fontSize: "0.875rem" }}>
              © {new Date().getFullYear()} Campus Knowledge Hub. All Rights Reserved.
            </p>
            <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem" }}>
              <NavLink to="/privacy" style={{ color: "var(--color-slate-500-adaptive)", textDecoration: "none" }}>Privacy Policy</NavLink>
              <NavLink to="/terms" style={{ color: "var(--color-slate-500-adaptive)", textDecoration: "none" }}>Terms of Service</NavLink>
            </div>
          </div>
          <button
            onClick={() => setIsContactOpen(true)}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
              textDecoration: "underline",
              padding: 0
            }}
            type="button"
          >
            Contact Admin
          </button>
        </footer>
      </main>

      {isContactOpen ? (
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
                onClick={() => {
                  setIsContactOpen(false);
                  setContactError("");
                  setContactSuccess("");
                }}
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
                  onClick={() => {
                    setIsContactOpen(false);
                    setContactError("");
                    setContactSuccess("");
                  }}
                  type="button"
                  style={{ padding: "0 1.5rem" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <GlobalSearch />
    </div>
  );
}
