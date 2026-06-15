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
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  // Anti-Screenshot & Piracy Protection
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      // Block PrintScreen, Ctrl+S, Ctrl+P, F12, Ctrl+Shift+I, Ctrl+C
      if (
        e.key === "PrintScreen" || 
        e.keyCode === 44 || 
        (e.ctrlKey && e.key === "p") || 
        (e.ctrlKey && e.key === "s") || 
        (e.ctrlKey && e.key === "c") || 
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
        showError("Security Alert: Copying, Saving, or taking Screenshots is prohibited.");
      }
    };
    const handleBlur = () => setIsFocused(false);
    const handleFocus = () => setIsFocused(true);

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

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

  async function handleDownloadPdf() {
    try {
      const response = await apiClient.get(`/assignments/${id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Assignment_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showSuccess("PDF Downloaded successfully!");
    } catch (error) {
      if (error.response?.status === 403 || error.message.includes("403")) {
        setShowPremiumModal(true);
      } else {
        showError("Failed to download PDF.");
      }
    }
  }

  async function handlePayment(type) {
    setProcessingPayment(true);
    try {
      // Create order
      const orderRes = await apiClient.post("/payments/create-order", { paymentType: type, targetId: id });
      const orderData = orderRes.data.data;

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Campus Knowledge Hub",
        description: type === "subscription" ? "Monthly Unlimited Downloads" : "Single Assignment Unlock",
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            await apiClient.post("/payments/verify", response);
            showSuccess("Payment successful! You can now download.");
            setShowPremiumModal(false);
            // Auto trigger download after successful payment
            handleDownloadPdf();
          } catch (err) {
            showError("Payment verification failed.");
          }
        },
        prefill: {
          name: user?.fullName || "",
          email: user?.email || "",
        },
        theme: { color: "#f59e0b" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        showError("Payment failed or cancelled.");
      });
      rzp.open();
    } catch (err) {
      showError(err.response?.data?.message || "Could not initiate payment.");
    } finally {
      setProcessingPayment(false);
    }
  }

  if (loading) {
    return <div className="page-stack"><p className="muted">Loading assignment...</p></div>;
  }

  if (!assignment) {
    return <div className="page-stack"><p className="muted">Assignment not found or expired.</p></div>;
  }

  return (
    <div className="page-stack" style={{ 
      userSelect: "none", 
      WebkitUserSelect: "none", 
      msUserSelect: "none",
      position: "relative"
    }}>
      
      {/* Dynamic Watermark Overlay */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: "none", zIndex: 9998,
        overflow: "hidden", display: "flex", flexWrap: "wrap",
        opacity: 0.05, transform: "rotate(-30deg) scale(1.5)"
      }}>
        {Array.from({ length: 100 }).map((_, i) => (
          <span key={i} style={{ padding: "2rem", fontSize: "1.2rem", fontWeight: "bold", whiteSpace: "nowrap" }}>
            {user?.email} - {user?.id}
          </span>
        ))}
      </div>

      <div style={{ 
        filter: isFocused ? "none" : "blur(15px)", 
        transition: "filter 0.2s ease",
        pointerEvents: isFocused ? "auto" : "none"
      }}>
        <button 
          className="back-btn" 
          onClick={() => navigate("/assignments")}
          style={{ marginBottom: "1rem", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          ← Back to Live Assignments
        </button>

      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <span className="community-semester-tag" style={{ background: "#f59e0b20", color: "#f59e0b", marginBottom: "0.5rem" }}>
              {assignment.subject}
            </span>
            <h1 style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}>{assignment.title}</h1>
            <p className="muted" style={{ margin: 0 }}>This assignment will auto-delete 6 hours after posting.</p>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button 
              onClick={handleDownloadPdf}
              className="action-button approve"
              style={{ padding: "0.5rem 1rem", background: "#f59e0b", color: "black", borderColor: "#f59e0b" }}
            >
              💾 Save Discussion as PDF
            </button>
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

      {!isFocused && (
        <div style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          background: "rgba(0,0,0,0.8)", color: "white", padding: "2rem", borderRadius: "8px",
          zIndex: 9999, textAlign: "center", border: "2px solid red"
        }}>
          <h2>⚠️ Security Warning</h2>
          <p>Please return focus to this window.</p>
        </div>
      )}

      {showPremiumModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "1rem"
        }}>
          <div style={{
            width: "100%", maxWidth: "500px", background: "rgba(30, 41, 59, 1)",
            border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px", overflow: "hidden"
          }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#f8fafc" }}>Premium Access Required</h2>
              <button onClick={() => setShowPremiumModal(false)} style={{ background: "none", border: "none", color: "var(--color-slate-400-adaptive)", cursor: "pointer", fontSize: "1.5rem" }}>&times;</button>
            </div>
            
            <div style={{ padding: "1.5rem" }}>
              <p style={{ marginBottom: "1.5rem", lineHeight: 1.5 }}>
                This thread will self-destruct soon. To permanently save this discussion and its solutions to your computer as a PDF, please unlock premium.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <button 
                  onClick={() => handlePayment("single_unlock")}
                  disabled={processingPayment}
                  style={{ background: "var(--color-bg-primary)", border: "1px solid #f59e0b", padding: "1rem", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div style={{ textAlign: "left" }}>
                    <strong style={{ display: "block", color: "#f59e0b", fontSize: "1.1rem" }}>Single Unlock</strong>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>Download just this specific assignment forever.</span>
                  </div>
                  <strong style={{ fontSize: "1.2rem" }}>₹2</strong>
                </button>

                <button 
                  onClick={() => handlePayment("subscription")}
                  disabled={processingPayment}
                  style={{ background: "var(--color-bg-primary)", border: "1px solid #3b82f6", padding: "1rem", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div style={{ textAlign: "left" }}>
                    <strong style={{ display: "block", color: "#3b82f6", fontSize: "1.1rem" }}>Monthly Premium</strong>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>Unlimited downloads of any assignment.</span>
                  </div>
                  <strong style={{ fontSize: "1.2rem" }}>₹69<span style={{ fontSize: "0.8rem", color: "gray" }}>/mo</span></strong>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
