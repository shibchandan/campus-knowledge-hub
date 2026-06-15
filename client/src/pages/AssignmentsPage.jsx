import { useEffect, useState, useRef } from "react";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/ToastContext";
import { useNavigate, Link } from "react-router-dom";

const initialForm = {
  title: "",
  subject: "",
  message: "",
  attachmentUrl: "",
  attachmentName: ""
};

export function AssignmentsPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    setLoading(true);
    try {
      const response = await apiClient.get("/assignments");
      setAssignments(response.data.data || []);
    } catch (error) {
      console.error("Failed to load assignments", error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Reusing the general upload route
      const uploadRes = await apiClient.post("/resources/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const uploadedUrl = uploadRes.data.url;
      setForm({ ...form, attachmentUrl: uploadedUrl, attachmentName: file.name });
      showSuccess("File uploaded successfully.");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to upload file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (!user) {
      showError("Please log in to post an assignment.");
      navigate("/login");
      return;
    }
    setCreating(true);
    try {
      await apiClient.post("/assignments", form);
      setShowCreateModal(false);
      setForm(initialForm);
      showSuccess("Assignment posted! It will disappear in 6 hours.");
      await loadAssignments();
    } catch (error) {
      showError(error.response?.data?.message || "Failed to create assignment.");
    } finally {
      setCreating(false);
    }
  }

  const filtered = assignments.filter((a) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.title?.toLowerCase().includes(term) ||
      a.subject?.toLowerCase().includes(term) ||
      a.message?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="page-stack">
      <SectionCard
        title="Live Assignments (Ephemeral)"
        description="Share assignments and solutions with your college. All posts self-destruct after 6 hours."
      >
        <div className="list-toolbar">
          <input
            className="college-search"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search assignments by title or subject..."
            type="text"
            value={searchTerm}
          />
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <p className="muted">{filtered.length} active posts</p>
            <button 
              className="action-button approve" 
              onClick={() => {
                if (!user) {
                  showError("Please log in to start.");
                  navigate("/login");
                } else {
                  setShowCreateModal(true);
                }
              }}
            >
              + Post Assignment
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
              <h3 style={{ margin: 0 }}>Post an Assignment / Question</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "1.2rem" }}>&times;</button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                <div className="auth-field">
                  <label>Title</label>
                  <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g., Physics Assignment 3 Help" />
                </div>
                <div className="auth-field">
                  <label>Subject Code</label>
                  <input required type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="e.g., PHY101" />
                </div>
              </div>
              
              <div className="auth-field">
                <label>Question or Context</label>
                <textarea required rows={4} value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Describe the assignment or what you need help with..."></textarea>
              </div>

              <div className="auth-field">
                <label>Optional Attachment (PDF/Image)</label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  disabled={uploadingFile}
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ padding: "0.5rem" }}
                />
                {uploadingFile && <span className="muted">Uploading...</span>}
                {form.attachmentName && <span className="success-note">Attached: {form.attachmentName}</span>}
              </div>

              <button type="submit" disabled={creating || uploadingFile} className="auth-submit" style={{ background: "#f59e0b" }}>
                {creating ? "Posting..." : "Post (Deletes in 6 hrs)"}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <p className="muted">Loading live assignments...</p>
        ) : filtered.length === 0 ? (
          <div className="lecture-empty-state">
            <span className="lecture-empty-icon">⏳</span>
            <h3>No Live Assignments</h3>
            <p className="muted">
              {searchTerm
                ? "No posts match your search."
                : "No active assignments in your college right now. Posts vanish after 6 hours!"}
            </p>
          </div>
        ) : (
          <div className="community-grid">
            {filtered.map((a) => (
              <article className="community-card-enhanced" key={a._id} style={{ borderLeft: "4px solid #f59e0b" }}>
                <div className="community-card-body">
                  <div className="community-card-top-row">
                    <span className="community-semester-tag" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                      {a.subject}
                    </span>
                    <span className="muted" style={{ fontSize: "0.8rem" }}>
                      Expires soon
                    </span>
                  </div>
                  <h3 className="community-card-title">{a.title}</h3>
                  <p className="muted community-card-desc">{a.message}</p>
                  
                  <div className="community-card-details">
                    <span className="community-detail-item">
                      👤 {a.author?.fullName || "Anonymous"}
                    </span>
                    {a.attachmentUrl && (
                      <span className="community-detail-item" style={{ color: "#3b82f6" }}>
                        📎 Has Attachment
                      </span>
                    )}
                  </div>
                </div>
                <div className="community-card-footer">
                  <span className="community-replies-badge" style={{ background: "#1f2937", color: "white" }}>
                    {a.replies?.length || 0} Replies
                  </span>
                  <Link 
                    to={`/assignments/${a._id}`}
                    className="community-join-btn" 
                    style={{ color: "#f59e0b", textDecoration: "none" }}
                  >
                    View & Reply →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
