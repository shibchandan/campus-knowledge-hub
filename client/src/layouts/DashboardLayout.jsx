import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { useAuth } from "../auth/AuthContext";
import { useCollege } from "../college/CollegeContext";
import { useTheme } from "../theme/ThemeContext";
import { NotificationDropdown } from "../components/NotificationDropdown";
import { GlobalSearch } from "../components/GlobalSearch";
import { ContactAdminModal } from "../components/ContactAdminModal";
import { UserDropdown } from "../components/UserDropdown";
import { PrefetchLink } from "../components/PrefetchLink";

const navSections = [
  {
    label: "Main",
    links: [
      { to: "/colleges", label: "Colleges", icon: "🏛️", prefetchRoute: "/governance/public-colleges" },
      { to: "/panel", label: "Panel", icon: "⚙️" },
      { to: "/account", label: "Account", icon: "👤", prefetchRoute: "/settings/me" }
    ]
  },
  {
    label: "Academic",
    links: [
      { to: "/dashboard", label: "Overview", icon: "📊", prefetchRoute: "/notices" },
      { to: "/lectures", label: "Lectures", icon: "🎬", prefetchRoute: "/lectures" },
      { to: "/notes", label: "Notes & PYQs", icon: "📝", prefetchRoute: "/resources" },
      { to: "/quizzes", label: "Quizzes", icon: "✅", prefetchRoute: "/quizzes" },
      { to: "/assignments", label: "Live Assignments", icon: "⏳", prefetchRoute: "/assignments" }
    ]
  },
  {
    label: "Tools",
    links: [
      { to: "/ai-studio", label: "AI Studio", icon: "🤖" },
      { to: "/integrity", label: "Integrity", icon: "🛡️" },
      { to: "/marketplace", label: "Marketplace", icon: "🛒", prefetchRoute: "/marketplace" },
      { to: "/community", label: "Community", icon: "💬", prefetchRoute: "/community/groups" }
    ]
  }
];

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });
  
  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem("sidebarCollapsed", newVal);
      return newVal;
    });
  };

  const { user, logout } = useAuth();
  const { selectedCollege } = useCollege();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isContactOpen, setIsContactOpen] = useState(false);

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "G";

  return (
    <div className={`shell ${isSidebarOpen ? "sidebar-open" : ""} ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`.trim()}>
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
          {navSections.map((section) => {
            const visibleLinks = section.links.filter(link => {
              if (link.to === "/integrity" && user?.role === "student") return false;
              return true;
            });
            if (visibleLinks.length === 0) return null;

            return (
              <div className="nav-section" key={section.label}>
                <p className="nav-section-label">{section.label}</p>
                {visibleLinks.map((link) => (
                  <PrefetchLink
                    key={link.to}
                    to={link.to}
                  prefetchRoute={link.prefetchRoute}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                  title={isSidebarCollapsed ? link.label : undefined}
                >
                  <span className="nav-link-icon">{link.icon}</span>
                  <span className="nav-link-text">{link.label}</span>
                </PrefetchLink>
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
              <p className="sidebar-user-role">
                {user?.role || "Visitor"}
                {user && (
                  <span title="Reputation Points" style={{ marginLeft: "6px", color: "#f59e0b" }}>
                    ⭐ {user.reputationScore || 0}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <button
          className="sidebar-collapse-toggle"
          onClick={toggleSidebarCollapse}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          type="button"
        >
          {isSidebarCollapsed ? "❯" : "❮"}
        </button>
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

          <UserDropdown />

          <div className="topbar-actions">
            <button
              className="action-button neutral"
              onClick={() => window.dispatchEvent(new Event('open-global-search'))}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "var(--color-slate-400-adaptive)", fontSize: "0.875rem" }}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Search
              <kbd style={{ marginLeft: "8px", fontSize: "0.7rem", background: "var(--glass-bg-hover)", padding: "2px 6px", borderRadius: "4px" }}>⌘K</kbd>
            </button>
            <div style={{ display: "flex", gap: "8px", width: "100%" }}>
              <button className="theme-button" onClick={toggleTheme} type="button" style={{ flex: 1 }}>
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              <NotificationDropdown />
            </div>

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

        {user?.role === "student" && user?.studentVerificationStatus !== "verified" && location.pathname !== "/account" && (
          <div
            style={{
              margin: "0 1.5rem 1rem",
              padding: "14px 20px",
              background: "linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.08))",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>⚠️</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                  Complete Your Profile
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--color-slate-400-adaptive)", lineHeight: 1.4 }}>
                  {!user?.collegeName
                    ? "Select your college, add your College ID, and upload verification documents to access college resources."
                    : user?.studentVerificationStatus === "pending"
                      ? "Your verification is under review. You'll get full access once an admin approves it."
                      : user?.studentVerificationStatus === "rejected"
                        ? "Your verification was rejected. Please update your details and resubmit."
                        : "Add your College ID and upload verification documents to unlock all features."
                  }
                </p>
              </div>
            </div>
            {user?.studentVerificationStatus !== "pending" && (
              <button
                onClick={() => navigate("/account")}
                style={{
                  padding: "8px 20px",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = "0.85"}
                onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
              >
                Complete Now →
              </button>
            )}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
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
              fontWeight: "var(--fw-sub)",
              textDecoration: "underline",
              padding: 0
            }}
            type="button"
          >
            Contact Admin
          </button>
        </footer>
      </main>

      <ContactAdminModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />

      <GlobalSearch />
    </div>
  );
}
