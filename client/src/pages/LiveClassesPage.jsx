import { useEffect, useState, useCallback } from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/ToastContext";
import "./LiveClassesPage.css";

export function LiveClassesPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { selectedCollege } = useCollege();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeRoom, setActiveRoom] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    semester: "",
    description: "",
    scheduledAt: "",
    duration: 60
  });
  const [submitting, setSubmitting] = useState(false);

  const canSchedule = user?.role === "representative" || user?.role === "admin";

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/live-classes");
      setClasses(response.data.data || []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses, selectedCollege?.name]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/live-classes", formData);
      showSuccess("Live class scheduled successfully!");
      setFormData({
        title: "",
        subject: "",
        semester: "",
        description: "",
        scheduledAt: "",
        duration: 60
      });
      loadClasses();
    } catch {
      showError("Failed to schedule live class.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await apiClient.patch(`/live-classes/${id}`, { status });
      showSuccess(`Class marked as ${status}`);
      loadClasses();
    } catch {
      showError(`Failed to update status to ${status}`);
    }
  };

  const joinRoom = (cls) => {
    setActiveRoom(cls);
  };

  const leaveRoom = () => {
    setActiveRoom(null);
  };

  const filtered = classes.map((cls) => {
    let effectiveStatus = cls.status || "scheduled";
    const now = new Date();
    const classStart = new Date(cls.scheduledAt);
    const classEnd = new Date(classStart.getTime() + (cls.duration || 60) * 60000);

    if ((effectiveStatus === "scheduled" || effectiveStatus === "live") && now > classEnd) {
      effectiveStatus = "completed";
    }
    return { ...cls, effectiveStatus };
  }).filter((cls) => {
    const status = cls.effectiveStatus;
    if (statusFilter !== "All") {
      if (statusFilter === "Upcoming" && status !== "scheduled") return false;
      if (statusFilter === "Live Now" && status !== "live") return false;
      if (statusFilter === "Completed" && status !== "completed") return false;
    }

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      cls.title?.toLowerCase().includes(term) ||
      cls.subject?.toLowerCase().includes(term)
    );
  });

  const hasClasses = classes.length > 0;

  // ─── ACTIVE VIDEO ROOM ───
  if (activeRoom) {
    return (
      <div className="jitsi-room-container">
        <div className="jitsi-room-header">
          <div className="jitsi-room-info">
            <span className="status-badge live"><span className="pulse-dot" />Live</span>
            <h2>{activeRoom.title}</h2>
            <span className="muted">{activeRoom.subject} • {activeRoom.semester}</span>
          </div>
          <button className="leave-btn" onClick={leaveRoom}>
            ✕ Leave Class
          </button>
        </div>
        <div className="jitsi-room-frame">
          <JitsiMeeting
            domain="meet.jit.si"
            roomName={activeRoom.roomName}
            configOverwrite={{
              startWithAudioMuted: true,
              startWithVideoMuted: false,
              disableModeratorIndicator: true,
              prejoinPageEnabled: false,
              toolbarButtons: [
                "microphone", "camera", "desktop", "chat",
                "raisehand", "participants-pane", "tileview",
                "fullscreen", "hangup"
              ]
            }}
            interfaceConfigOverwrite={{
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              SHOW_BRAND_WATERMARK: false,
              TOOLBAR_ALWAYS_VISIBLE: true,
              DEFAULT_BACKGROUND: "#0d111c"
            }}
            userInfo={{
              displayName: user?.fullName || "Student",
              email: user?.email || ""
            }}
            onReadyToClose={leaveRoom}
            getIFrameRef={(node) => {
              if (node) {
                node.style.height = "100%";
                node.style.width = "100%";
                node.style.border = "none";
                node.style.borderRadius = "12px";
              }
            }}
          />
        </div>
      </div>
    );
  }

  // ─── CLASS LISTING ───
  return (
    <div className="page-stack">
      <SectionCard
        title="Live Classes"
        description="Join live sessions hosted by your college representatives. Connect, learn, and interact in real-time — directly inside the app."
        variant="hero"
      >
        {canSchedule && (
          <div className="schedule-form-container">
            <h3>Schedule a Live Class</h3>
            <form onSubmit={handleScheduleSubmit} className="schedule-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Class Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter class title"
                    className="auth-field"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="e.g. Data Structures"
                    className="auth-field"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Semester</label>
                  <input
                    type="text"
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    placeholder="e.g. 4th Semester"
                    className="auth-field"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    value={formData.scheduledAt}
                    onChange={handleInputChange}
                    className="auth-field datetime-field"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    placeholder="60"
                    className="auth-field"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="What will this class cover?"
                  className="auth-field"
                  rows="3"
                />
              </div>
              <button type="submit" className="glass-btn primary form-submit-btn" disabled={submitting}>
                {submitting ? "Scheduling..." : "📡 Schedule Class"}
              </button>
            </form>
          </div>
        )}

        <div className="list-toolbar">
          <input
            className="college-search"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, subject..."
            type="text"
            value={searchTerm}
          />
          <div className="status-filters">
            {["All", "Upcoming", "Live Now", "Completed"].map((filter) => (
              <button
                key={filter}
                className={`filter-btn ${statusFilter === filter ? "active" : ""}`}
                onClick={() => setStatusFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <p className="muted">{filtered.length} classes found</p>
        </div>

        {loading ? (
          <p className="muted">Loading classes...</p>
        ) : !hasClasses ? (
          <div className="live-classes-empty-state">
            <span className="live-classes-empty-icon">📡</span>
            <h3>No Live Classes Yet</h3>
            <p className="muted">
              No live classes are currently scheduled. Representatives will announce upcoming sessions here.
            </p>
          </div>
        ) : (
          <div className="live-classes-grid">
            {filtered.map((cls) => {
              const status = cls.effectiveStatus;

              return (
                <article className="live-class-card" key={cls._id}>
                  <div className={`status-badge ${status}`}>
                    {status === "live" && <span className="pulse-dot" />}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>

                  <h3 className="live-class-title">{cls.title}</h3>

                  <div className="live-class-tags">
                    <span className="chip subject-chip">{cls.subject}</span>
                    <span className="chip semester-chip">{cls.semester}</span>
                  </div>

                  {cls.description && (
                    <p className="live-class-desc muted">{cls.description}</p>
                  )}

                  <div className="live-class-meta">
                    <span className="meta-item">
                      📅 {new Date(cls.scheduledAt).toLocaleString("en-IN", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "numeric", minute: "2-digit"
                      })}
                    </span>
                    <span className="meta-item">⏱️ {cls.duration} min</span>
                    <span className="meta-item">👤 {cls.host?.fullName || "Host"}</span>
                  </div>

                  <div className="live-class-actions">
                    {status === "scheduled" || status === "live" ? (
                      <button
                        className="join-btn glass-btn primary"
                        onClick={() => joinRoom(cls)}
                      >
                        🎥 Join Class
                      </button>
                    ) : (
                      <button className="join-btn disabled" disabled>
                        {status === "completed" ? "Session Ended" : "Cancelled"}
                      </button>
                    )}

                    {(user?._id === cls.host?._id || user?.role === "admin") && (status === "scheduled" || status === "live") && (
                      <div className="host-actions">
                        <button onClick={() => updateStatus(cls._id, "completed")} className="action-btn complete">
                          ✓ Complete
                        </button>
                        <button onClick={() => updateStatus(cls._id, "cancelled")} className="action-btn cancel">
                          ✕ Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
