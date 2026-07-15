import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/apiClient";

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get("/notifications?limit=10");
      if (response.data.success) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.meta.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Fetch periodically every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      const response = await apiClient.put(`/notifications/${id}/read`);
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((notif) => (notif._id === id ? { ...notif, isRead: true } : notif))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiClient.put("/notifications/read-all");
      if (response.data.success) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "ℹ️";
    }
  };

  return (
    <div className="notification-dropdown-container" ref={dropdownRef} style={{ position: "relative" }}>
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: "8px",
          cursor: "pointer",
          position: "relative",
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-slate-400-adaptive)",
          height: "36px"
        }}
        aria-label="Notifications"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: "2px",
            right: "2px",
            backgroundColor: "#ef4444",
            color: "white",
            fontSize: "0.7rem",
            fontWeight: "bold",
            borderRadius: "50%",
            width: "18px",
            height: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: "8px",
          width: "320px",
          backgroundColor: "var(--color-bg-primary)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          maxHeight: "400px",
          overflow: "hidden"
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary-light)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  padding: 0
                }}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--color-slate-500-adaptive)" }}>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => !notif.isRead && markAsRead(notif._id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--color-border)",
                    backgroundColor: notif.isRead ? "transparent" : "var(--color-bg-secondary)",
                    cursor: notif.isRead ? "default" : "pointer",
                    display: "flex",
                    gap: "12px",
                    transition: "background-color 0.2s"
                  }}
                >
                  <div style={{ fontSize: "1.2rem", paddingTop: "2px" }}>
                    {getIconForType(notif.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
                      {notif.title}
                    </h4>
                    <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                      {notif.message}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-slate-500-adaptive)" }}>
                        {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {notif.link && (
                        <Link
                          to={notif.link}
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-primary-light)",
                            textDecoration: "none"
                          }}
                          onClick={() => setIsOpen(false)}
                        >
                          View Details →
                        </Link>
                      )}
                    </div>
                  </div>
                  {!notif.isRead && (
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-primary-light)",
                      alignSelf: "center",
                      flexShrink: 0
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
