import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../ui/ConfirmContext";
import { useToast } from "../ui/ToastContext";

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", { 
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true 
  });
}

function getChannelColor(channelType) {
  switch (channelType?.toLowerCase()) {
    case "chat": return "#10b981";
    case "mentorship": return "#f59e0b";
    case "forum": default: return "#3b82f6";
  }
}

export function CommunityThreadPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadThread() {
      try {
        const response = await apiClient.get(`/community/${id}`);
        setThread(response.data.data);
      } catch (error) {
        showError(error.response?.data?.message || "Failed to load thread.");
        navigate("/community");
      } finally {
        setLoading(false);
      }
    }
    loadThread();
  }, [id, navigate, showError]);

  async function handleReplySubmit(e) {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    const originalReplyText = replyMessage.trim();
    
    // Optimistic Update
    const tempReply = {
      _id: `temp-${Date.now()}`,
      user: {
        _id: user.id,
        fullName: user.fullName || "You",
        role: user.role
      },
      message: originalReplyText,
      createdAt: new Date().toISOString()
    };

    setThread(prev => ({ ...prev, replies: [...(prev?.replies || []), tempReply] }));
    setReplyMessage("");
    setReplying(true);

    try {
      await apiClient.post(`/community/${id}/reply`, { message: originalReplyText });
      showSuccess("Reply posted!");
      // Background sync to get the real ID and exact timestamp
      const response = await apiClient.get(`/community/${id}`);
      setThread(response.data.data);
    } catch (error) {
      showError(error.response?.data?.message || "Failed to post reply.");
      // Rollback
      setThread(prev => ({ ...prev, replies: (prev?.replies || []).filter(r => r._id !== tempReply._id) }));
      setReplyMessage(originalReplyText);
    } finally {
      setReplying(false);
    }
  }

  async function handleDeleteThread() {
    const isConfirmed = await confirm({
      title: "Delete Thread",
      message: `Are you sure you want to completely delete "${thread?.title || 'this thread'}"?`,
      confirmText: "Delete Thread",
      intent: "danger"
    });
    if (!isConfirmed) return;

    if (!window.confirm("Are you sure you want to delete this thread?")) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/community/${id}`);
      showSuccess("Thread deleted.");
      navigate("/community");
    } catch (error) {
      showError(error.response?.data?.message || "Failed to delete thread.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-stack">
        <p className="muted">Loading thread...</p>
      </div>
    );
  }

  if (!thread) return null;

  const color = getChannelColor(thread.channelType);

  return (
    <div className="page-stack">
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/community" style={{ color: "var(--color-text-muted)", textDecoration: "none", fontSize: "0.9rem" }}>
          &larr; Back to Community
        </Link>
      </div>

      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <span className="community-channel-tag" style={{ background: `${color}15`, color, marginBottom: "0.5rem", display: "inline-block" }}>
              {thread.channelType?.toUpperCase() || "FORUM"}
            </span>
            <span className="community-semester-tag" style={{ marginLeft: "0.5rem" }}>{thread.semester}</span>
            <h1 style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}>{thread.title}</h1>
            <p className="muted" style={{ margin: 0 }}>Subject: {thread.subject}</p>
          </div>
          {(user?.role === "admin" || user?.id === thread.createdBy?._id) && (
            <button 
              onClick={handleDeleteThread}
              disabled={deleting}
              className="action-button reject"
              style={{ padding: "0.5rem 1rem" }}
            >
              {deleting ? "Deleting..." : "Delete Thread"}
            </button>
          )}
        </div>

        <div style={{ 
          padding: "1.5rem", 
          background: "var(--color-bg-secondary)", 
          borderRadius: "8px",
          border: "1px solid var(--color-border)",
          marginBottom: "2rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <strong style={{ color: color }}>{thread.createdBy?.fullName || "Anonymous"}</strong>
            <span className="muted" style={{ fontSize: "0.85rem" }}>{formatDate(thread.createdAt)}</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>{thread.message}</p>
        </div>

        <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
          {thread.replies?.length || 0} Replies
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
          {thread.replies?.map((reply, idx) => (
            <div key={idx} style={{ 
              padding: "1rem", 
              borderLeft: `3px solid ${color}40`,
              background: "var(--color-bg-secondary)",
              borderRadius: "0 8px 8px 0"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <strong style={{ fontSize: "0.95rem" }}>{reply.author?.fullName || "Anonymous"}</strong>
                <span className="muted" style={{ fontSize: "0.8rem" }}>{formatDate(reply.createdAt)}</span>
              </div>
              <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>{reply.message}</p>
            </div>
          ))}
          {(!thread.replies || thread.replies.length === 0) && (
            <p className="muted" style={{ fontStyle: "italic" }}>No replies yet. Be the first to answer!</p>
          )}
        </div>

        <form onSubmit={handleReplySubmit} style={{ marginTop: "1rem" }}>
          <h4 style={{ marginBottom: "0.5rem" }}>Post a Reply</h4>
          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Type your reply here..."
            required
            rows={4}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-primary)",
              color: "var(--color-text-primary)",
              marginBottom: "1rem",
              resize: "vertical"
            }}
          />
          <button 
            type="submit" 
            disabled={replying || !replyMessage.trim()}
            className="auth-submit"
            style={{ width: "auto", padding: "0.75rem 1.5rem" }}
          >
            {replying ? "Posting..." : "Post Reply"}
          </button>
        </form>

      </SectionCard>
    </div>
  );
}
