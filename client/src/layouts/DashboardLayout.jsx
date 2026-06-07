import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCollege } from "../college/CollegeContext";
import { useTheme } from "../theme/ThemeContext";

const links = [
  { to: "/colleges", label: "Colleges" },
  { to: "/panel", label: "Panel" },
  { to: "/account", label: "Account" },
  { to: "/dashboard", label: "Overview" },
  { to: "/lectures", label: "Lectures" },
  { to: "/notes", label: "Notes & PYQs" },
  { to: "/quizzes", label: "Quizzes" },
  { to: "/ai-studio", label: "AI Studio" },
  { to: "/integrity", label: "Integrity" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/community", label: "Community" }
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

        <div>
          <p className="eyebrow">Campus Knowledge Hub</p>
          <h1>Academic Control Center</h1>
          <p className="muted">
            College-managed learning operations with lectures, resources, AI study help, and governed academic workflows.
          </p>
        </div>

        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {link.label}
            </NavLink>
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
