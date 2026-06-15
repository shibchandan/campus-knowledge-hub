import { useEffect, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/ToastContext";
import { useNavigate } from "react-router-dom";

const initialThreadForm = {
  title: "",
  subject: "",
  semester: "",
  channelType: "forum",
  message: ""
};

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const oneDay = 86400000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return `Today, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  }
  if (diff < oneDay * 2) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getChannelIcon(channelType) {
  switch (channelType?.toLowerCase()) {
    case "chat":
      return "💬";
    case "mentorship":
      return "🤝";
    case "forum":
    default:
      return "📰";
  }
}

function getChannelColor(channelType) {
  switch (channelType?.toLowerCase()) {
    case "chat":
      return "#10b981"; // Emerald
    case "mentorship":
      return "#f59e0b"; // Amber
    case "forum":
    default:
      return "#3b82f6"; // Blue
  }
}

export function CommunityPage() {
  const { user } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newThreadForm, setNewThreadForm] = useState(initialThreadForm);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadThreads();
  }, []);

  async function loadThreads() {
    setLoading(true);
    try {
      const response = await apiClient.get("/community");
      setThreads(response.data.data || []);
    } catch (error) {
      console.error("Failed to load community threads", error);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (!user) {
      showError("Please log in to start a discussion.");
      navigate("/login");
      return;
    }
    setCreating(true);
    try {
      await apiClient.post("/community", newThreadForm);
      setShowCreateModal(false);
      setNewThreadForm(initialThreadForm);
      showSuccess("Discussion started successfully!");
      await loadThreads();
    } catch (error) {
      showError(error.response?.data?.message || "Failed to create discussion.");
    } finally {
      setCreating(false);
    }
  }

  const filtered = threads.filter((thread) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      thread.title?.toLowerCase().includes(term) ||
      thread.subject?.toLowerCase().includes(term) ||
      thread.message?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="page-stack">
      <SectionCard
        title="Collaboration & Community"
        description="Discussion forums, doubt solving, peer mentorship, and college-only communication channels."
      >
        <div className="list-toolbar">
          <input
            className="college-search"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search discussions by title or subject..."
            type="text"
            value={searchTerm}
          />
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <p className="muted">{filtered.length} discussions found</p>
            <button 
              className="action-button approve" 
              onClick={() => {
                if (!user) {
                  showError("Please log in to start a discussion.");
                  navigate("/login");
                } else {
                  setShowCreateModal(true);
                }
              }}
            >
              + Start Discussion
            </button>
          </div>
        </div>

        {showCreateModal && (
          <div style={{ 
            padding: "1.5rem", 
            background: "var(--color-bg-secondary)", 
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
            marginBottom: "2rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Start a New Discussion</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "1.2rem" }}>&times;</button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="auth-field">
                <label>Title</label>
                <input required type="text" value={newThreadForm.title} onChange={e => setNewThreadForm({...newThreadForm, title: e.target.value})} placeholder="e.g., Help with Assignment 2" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div className="auth-field">
                  <label>Subject Code</label>
                  <input required type="text" value={newThreadForm.subject} onChange={e => setNewThreadForm({...newThreadForm, subject: e.target.value})} placeholder="e.g., CS101" />
                </div>
                <div className="auth-field">
                  <label>Semester</label>
                  <input required type="text" value={newThreadForm.semester} onChange={e => setNewThreadForm({...newThreadForm, semester: e.target.value})} placeholder="e.g., Sem 1" />
                </div>
                <div className="auth-field">
                  <label>Type</label>
                  <select required value={newThreadForm.channelType} onChange={e => setNewThreadForm({...newThreadForm, channelType: e.target.value})} style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}>
                    <option value="forum">General Forum</option>
                    <option value="chat">Study Chat</option>
                    <option value="mentorship">Peer Mentorship</option>
                  </select>
                </div>
              </div>
              <div className="auth-field">
                <label>Message</label>
                <textarea required rows={4} value={newThreadForm.message} onChange={e => setNewThreadForm({...newThreadForm, message: e.target.value})} placeholder="What's on your mind?" style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", resize: "vertical" }}></textarea>
              </div>
              <button type="submit" disabled={creating} className="auth-submit">
                {creating ? "Creating..." : "Post Discussion"}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <p className="muted">Loading discussions...</p>
        ) : filtered.length === 0 ? (
          <div className="lecture-empty-state">
            <span className="lecture-empty-icon">💬</span>
            <h3>No Discussions Found</h3>
            <p className="muted">
              {searchTerm
                ? "No discussions match your search."
                : "Be the first to start a discussion in the community!"}
            </p>
          </div>
        ) : (
          <div className="community-grid">
            {filtered.map((thread) => {
              const color = getChannelColor(thread.channelType);
              return (
                <article className="community-card-enhanced" key={thread._id}>
                  <div className="community-card-accent" style={{ background: color }} />
                  <div className="community-card-body">
                    <div className="community-card-top-row">
                      <span className="community-card-icon">{getChannelIcon(thread.channelType)}</span>
                      <span className="community-channel-tag" style={{ background: `${color}15`, color }}>
                        {thread.channelType?.toUpperCase() || "FORUM"}
                      </span>
                      <span className="community-semester-tag">
                        {thread.semester}
                      </span>
                    </div>
                    <h3 className="community-card-title">{thread.title}</h3>
                    <p className="muted community-card-desc">{thread.message}</p>
                    
                    <div className="community-card-details">
                      <span className="community-detail-item">
                        👤 {thread.createdBy?.fullName || "Anonymous"}
                      </span>
                      <span className="community-detail-item">
                        📖 {thread.subject}
                      </span>
                      <span className="community-detail-item">
                        🕐 {formatDate(thread.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="community-card-footer">
                    <span className="community-replies-badge">
                      {thread.replies?.length || 0} Replies
                    </span>
                    <button 
                      className="community-join-btn" 
                      style={{ color }}
                      onClick={() => {
                        if (!user) {
                          showError("Please log in to join discussions.");
                          navigate("/login");
                        } else {
                          navigate(`/community/${thread._id}`);
                        }
                      }}
                    >
                      {user ? "Join Discussion →" : "Join Discussion 🔒"}
                    </button>
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
