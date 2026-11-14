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

// Clean Lucide-compatible line icons (18px, 1.5 stroke)
const IconColleges = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2l10 5H2l10-5z"/>
  </svg>
);
const IconPanel = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconAccount = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4"/>
    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
  </svg>
);
const IconOverview = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const IconLectures = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);
const IconLiveClasses = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
    <circle cx="12" cy="12" r="2"/>
    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
    <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19.1"/>
  </svg>
);
const IconNotes = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconQuizzes = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);
const IconAssignments = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconAiStudio = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
  </svg>
);
const IconIntegrity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconMarketplace = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
    <path d="M3 6h18"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);
const IconCommunity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const navSections = [
  {
    label: "Main",
    links: [
      { to: "/colleges", label: "Colleges", icon: <IconColleges />, prefetchRoute: "/governance/public-colleges" },
      { to: "/panel", label: "Panel", icon: <IconPanel /> },
      { to: "/account", label: "Account", icon: <IconAccount />, prefetchRoute: "/settings/me" }
    ]
  },
  {
    label: "Academic",
    links: [
      { to: "/dashboard", label: "Overview", icon: <IconOverview />, prefetchRoute: "/notices" },
      { to: "/lectures", label: "Lectures", icon: <IconLectures />, prefetchRoute: "/lectures" },
      { to: "/live-classes", label: "Live Classes", icon: <IconLiveClasses />, prefetchRoute: "/live-classes" },
      { to: "/notes", label: "Notes & PYQs", icon: <IconNotes />, prefetchRoute: "/resources" },
      { to: "/quizzes", label: "Quizzes", icon: <IconQuizzes />, prefetchRoute: "/quizzes" },
      { to: "/assignments", label: "Live Assignments", icon: <IconAssignments />, prefetchRoute: "/assignments" }
    ]
  },
  {
    label: "Tools",
    links: [
      { to: "/ai-studio", label: "AI Studio", icon: <IconAiStudio /> },
      { to: "/integrity", label: "Integrity", icon: <IconIntegrity /> },
      { to: "/marketplace", label: "Marketplace", icon: <IconMarketplace />, prefetchRoute: "/marketplace" },
      { to: "/community", label: "Community", icon: <IconCommunity />, prefetchRoute: "/community/groups" }
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
    <>
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
              <h2>Academic Portal</h2>
            </div>
          </div>
          <p className="muted sidebar-brand-desc">
            Verified course structures, syllabi, study materials, and campus workflows.
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
          );
        })}
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
                  <span title="Reputation Points" style={{ marginLeft: "8px", color: "var(--glass-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    • {user.reputationScore || 0} pts
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
              padding: "12px 16px",
              background: "var(--glass-bg, #19191b)",
              border: "1px solid var(--glass-border, rgba(255, 255, 255, 0.08))",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "var(--color-amber-500, #d97706)" }}>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <p style={{ margin: 0, fontWeight: 500, fontSize: "0.875rem", color: "var(--glass-text-primary)" }}>
                  Complete your student profile
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--glass-text-secondary)", lineHeight: 1.4 }}>
                  {!user?.collegeName
                    ? "Select your college, add your student ID, and upload verification documents."
                    : user?.studentVerificationStatus === "pending"
                      ? "Your verification is currently under review by an administrator."
                      : user?.studentVerificationStatus === "rejected"
                        ? "Verification was rejected. Please update your details and resubmit."
                        : "Add your student ID and upload verification documents to unlock all course features."
                  }
                </p>
              </div>
            </div>
            {user?.studentVerificationStatus !== "pending" && (
              <button
                onClick={() => navigate("/account")}
                className="glowing-btn primary small"
                style={{ whiteSpace: "nowrap" }}
              >
                Complete profile
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
          marginTop: "auto",
          padding: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          borderTop: "1px solid var(--glass-border)",
          background: "var(--glass-bg-subtle)",
          borderRadius: "12px"
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
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              padding: "0.5rem 1rem",
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "8px",
              color: "#3b82f6",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "var(--fw-sub)"
            }}
            type="button"
          >
            Contact Admin
          </button>
        </footer>
      </main>
      </div>

      <ContactAdminModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      <GlobalSearch />
    </>
  );
}
