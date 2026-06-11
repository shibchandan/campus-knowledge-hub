import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCollege } from "../college/CollegeContext";
import { useTheme } from "../theme/ThemeContext";

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
      { to: "/quizzes", label: "Quizzes", icon: "✅" }
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
        <Outlet />
      </main>
    </div>
  );
}
