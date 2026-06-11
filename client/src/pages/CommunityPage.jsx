import { useEffect, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";

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
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
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
    loadThreads();
  }, []);

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
          <p className="muted">{filtered.length} discussions found</p>
        </div>

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
                    <button className="community-join-btn" style={{ color }}>
                      Join Discussion →
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
