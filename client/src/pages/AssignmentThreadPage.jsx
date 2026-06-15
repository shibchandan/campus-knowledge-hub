import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/ToastContext";

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", { 
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true 
  });
}

export function AssignmentThreadPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const fileInputRef = useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyAttachmentUrl, setReplyAttachmentUrl] = useState("");
  const [replyAttachmentName, setReplyAttachmentName] = useState("");

  useEffect(() => {
    async function loadAssignment() {
      try {
        const response = await apiClient.get(`/assignments/${id}`);
        setAssignment(response.data.data);
      } catch (error) {
        showError(error.response?.data?.message || "Failed to load assignment or it expired.");
        navigate("/assignments");
      } finally {
        setLoading(false);
      }
    }
    loadAssignment();
  }, [id, navigate, showError]);

  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await apiClient.post("/resources/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setReplyAttachmentUrl(uploadRes.data.url);
      setReplyAttachmentName(file.name);
      showSuccess("Attachment uploaded successfully.");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to upload attachment.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleReplySubmit(e) {
    e.preventDefault();
    if (!replyMessage.trim() && !replyAttachmentUrl) {
      showError("Please enter a message or attach a file.");
      return;
    }

    setReplying(true);
    try {
      await apiClient.post(`/assignments/${id}/reply`, { 
        message: replyMessage,
        attachmentUrl: replyAttachmentUrl,
        attachmentName: replyAttachmentName
      });
      
      setReplyMessage("");
      setReplyAttachmentUrl("");
      setReplyAttachmentName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      showSuccess("Reply posted!");
      // Reload
      const response = await apiClient.get(`/assignments/${id}`);
      setAssignment(response.data.data);
    } catch (error) {
      showError(error.response?.data?.message || "Failed to post reply.");
    } finally {
      setReplying(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this assignment permanently?")) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/assignments/${id}`);
      showSuccess("Assignment deleted.");
      navigate("/assignments");
    } catch (error) {
      showError(error.response?.data?.message || "Failed to delete.");
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="page-stack"><p className="muted">Loading assignment...</p></div>;
  }

  if (!assignment) return null;

  return (
    <div className="page-stack">
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/assignments" style={{ color: "var(--color-text-muted)", textDecoration: "none", fontSize: "0.9rem" }}>
          &larr; Back to Live Assignments
        </Link>
      </div>

      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <span className="community-semester-tag" style={{ background: "#f59e0b20", color: "#f59e0b", marginBottom: "0.5rem" }}>
              {assignment.subject}
            </span>
            <h1 style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}>{assignment.title}</h1>
            <p className="muted" style={{ margin: 0 }}>This assignment will auto-delete 6 hours after posting.</p>
          </div>
          {(user?.role === "admin" || user?.id === assignment.author?._id) && (
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="action-button reject"
              style={{ padding: "0.5rem 1rem" }}
            >
              {deleting ? "Deleting..." : "Delete Assignment"}
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
            <strong style={{ color: "#f59e0b" }}>{assignment.author?.fullName || "Anonymous"}</strong>
            <span className="muted" style={{ fontSize: "0.85rem" }}>{formatDate(assignment.createdAt)}</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0, marginBottom: assignment.attachmentUrl ? "1rem" : "0" }}>
            {assignment.message}
          </p>
          {assignment.attachmentUrl && (
            <div style={{ background: "var(--color-bg-primary)", padding: "1rem", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "1rem", border: "1px solid var(--color-border)" }}>
              <span>📎 {assignment.attachmentName || "Attachment"}</span>
              <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer" className="action-button" style={{ textDecoration: "none", fontSize: "0.9rem" }}>
                Download
              </a>
            </div>
          )}
        </div>

        <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
          {assignment.replies?.length || 0} Comments / Solutions
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
          {assignment.replies?.map((reply, idx) => (
            <div key={idx} style={{ 
              padding: "1rem", 
              borderLeft: "3px solid #f59e0b40",
              background: "var(--color-bg-secondary)",
              borderRadius: "0 8px 8px 0"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <strong style={{ fontSize: "0.95rem" }}>{reply.author?.fullName || "Anonymous"}</strong>
                <span className="muted" style={{ fontSize: "0.8rem" }}>{formatDate(reply.createdAt)}</span>
              </div>
              <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: "0.95rem", lineHeight: 1.5, marginBottom: reply.attachmentUrl ? "0.5rem" : "0" }}>
                {reply.message}
              </p>
              {reply.attachmentUrl && (
                <div style={{ marginTop: "0.5rem" }}>
                  <a href={reply.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", fontSize: "0.9rem" }}>
                    📎 {reply.attachmentName || "Download Solution File"}
                  </a>
                </div>
              )}
            </div>
          ))}
          {(!assignment.replies || assignment.replies.length === 0) && (
            <p className="muted" style={{ fontStyle: "italic" }}>No solutions yet. Be the first to help out!</p>
          )}
        </div>

        <form onSubmit={handleReplySubmit} style={{ marginTop: "1rem" }}>
          <h4 style={{ marginBottom: "0.5rem" }}>Add a Solution or Comment</h4>
          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Type your explanation here..."
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
          
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <label className="muted" style={{ fontSize: "0.9rem" }}>Attach Solution File (Optional):</label>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              disabled={uploadingFile}
              style={{ fontSize: "0.9rem" }}
            />
            {uploadingFile && <span className="muted" style={{ fontSize: "0.9rem" }}>Uploading...</span>}
            {replyAttachmentName && !uploadingFile && <span className="success-note" style={{ fontSize: "0.9rem" }}>Ready: {replyAttachmentName}</span>}
          </div>

          <button 
            type="submit" 
            disabled={replying || uploadingFile || (!replyMessage.trim() && !replyAttachmentUrl)}
            className="auth-submit"
            style={{ width: "auto", padding: "0.75rem 1.5rem" }}
          >
            {replying ? "Posting..." : "Post Solution"}
          </button>
        </form>

      </SectionCard>
    </div>
  );
}
