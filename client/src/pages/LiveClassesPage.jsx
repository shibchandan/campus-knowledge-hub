import { useEffect, useState } from "react";
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
  
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    semester: "",
    meetingUrl: "",
    description: "",
    scheduledAt: "",
    duration: 60
  });
  const [submitting, setSubmitting] = useState(false);
  
  const canSchedule = user?.role === "representative" || user?.role === "admin";

  const loadClasses = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/live-classes");
      setClasses(response.data.data || []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [selectedCollege?.name]);

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
        meetingUrl: "",
        description: "",
        scheduledAt: "",
        duration: 60
      });
      loadClasses();
    } catch (err) {
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
    } catch (err) {
      showError(`Failed to update status to ${status}`);
    }
  };

  const filtered = classes.filter((cls) => {
    const status = cls.status || "scheduled";
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

  return (
    <div className="page-stack">
      <SectionCard
        title="Live Classes"
        description="Join live sessions hosted by your college representatives. Connect, learn, and interact in real-time."
        variant="hero"
      >
        {canSchedule && (
          <div className="schedule-form-container">
            <h3>Schedule a Live Class</h3>
            <form onSubmit={handleScheduleSubmit} className="schedule-form">
              <div className="form-row">
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Title"
                  className="auth-field"
                  required
                />
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Subject"
                  className="auth-field"
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  name="semester"
                  value={formData.semester}
                  onChange={handleInputChange}
                  placeholder="Semester"
                  className="auth-field"
                  required
                />
                <input
                  type="url"
                  name="meetingUrl"
                  value={formData.meetingUrl}
                  onChange={handleInputChange}
                  placeholder="Paste your Google Meet / Zoom link"
                  className="auth-field"
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="datetime-local"
                  name="scheduledAt"
                  value={formData.scheduledAt}
                  onChange={handleInputChange}
                  className="auth-field"
                  required
                />
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="Duration (minutes)"
                  className="auth-field"
                  min="1"
                  required
                />
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Description (optional)"
                className="auth-field"
                rows="3"
              />
              <button type="submit" className="glowing-btn primary" disabled={submitting}>
                {submitting ? "Scheduling..." : "Schedule Class"}
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
            <h3>No Live Classes</h3>
            <p className="muted">
              No live classes are currently scheduled. Representatives will announce upcoming sessions here.
            </p>
          </div>
        ) : (
          <div className="live-classes-grid">
            {filtered.map((cls) => {
              const status = cls.status || "scheduled";
              
              return (
                <article className="live-class-card" key={cls._id || cls.title}>
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
                      <a
                        href={cls.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="join-btn glowing-btn primary"
                      >
                        Join Class
                      </a>
                    ) : (
                      <button className="join-btn disabled" disabled>
                        {status === "completed" ? "Session Ended" : "Cancelled"}
                      </button>
                    )}

                    {(user?._id === cls.host?._id || user?.role === "admin") && (status === "scheduled" || status === "live") && (
                      <div className="host-actions">
                        <button onClick={() => updateStatus(cls._id, "completed")} className="action-btn complete">
                          Mark Complete
                        </button>
                        <button onClick={() => updateStatus(cls._id, "cancelled")} className="action-btn cancel">
                          Cancel
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
