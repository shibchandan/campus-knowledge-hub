import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext";

export function UserDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "G";

  return (
    <div
      className="user-chip"
      ref={dropdownRef}
      style={{ position: "relative", cursor: "pointer" }}
      onClick={() => setIsOpen(!isOpen)}
    >
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
      <div style={{ paddingRight: "8px" }}>
        <p className="user-name" style={{ margin: 0, fontWeight: "var(--fw-head)", fontSize: "0.95rem" }}>
          {user?.fullName?.split(" ")[0] || "Guest"}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginLeft: "4px", verticalAlign: "middle" }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </p>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "8px",
              width: "max-content",
              minWidth: "220px",
              maxWidth: "calc(100vw - 2rem)",
              backgroundColor: "var(--glass-bg-strong)",
              backdropFilter: "blur(16px)",
              color: "var(--glass-text-primary)",
              border: "1px solid var(--glass-border)",
              borderRadius: "12px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
              zIndex: 1000,
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="user-name" style={{ margin: 0, fontSize: "1rem" }}>
              {user?.fullName || "Guest User"}
              {user && (
                <span title="Reputation Points" style={{ marginLeft: "8px", fontSize: "0.85em", color: "#f59e0b" }}>
                  ⭐ {user.reputationScore || 0}
                </span>
              )}
            </p>
            <p className="muted" style={{ margin: 0 }}>{user?.email || "Browse Mode"}</p>
            <p className="topbar-meta" style={{ margin: 0, marginTop: "4px" }}>
              {user?.role || "visitor"} account
            </p>
            
            {user && (
              <button 
                onClick={() => {
                  setIsOpen(false);
                  navigate("/account");
                }}
                className="action-button neutral"
                style={{ marginTop: "12px", width: "100%", padding: "6px 12px", fontSize: "0.85rem" }}
              >
                Account Settings
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
