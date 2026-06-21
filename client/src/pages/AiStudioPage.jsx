import { useEffect, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { apiClient } from "../lib/apiClient";
import { Spinner, SkeletonCard } from "../components/LoadingStates";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../ui/ToastContext";

export function AiStudioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToast();
  const { selectedCollege } = useCollege();
  const [question, setQuestion] = useState("");
  const [intent, setIntent] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyBusyId, setHistoryBusyId] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyLimit, setHistoryLimit] = useState(3);
  const [files, setFiles] = useState([]);

  async function loadMeta() {
    if (!user) {
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const historyResponse = await apiClient.get("/ai/history");
      setHistory(historyResponse.data.data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
  }, []);

  async function handleAsk(event) {
    event.preventDefault();
    if (!user) {
      showError("Please log in to use AI features.");
      navigate("/login");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/ai/ask", {
        question,
        intent,
        collegeName: selectedCollege?.name || "",
        files: files.map(f => ({ mimeType: f.mimeType, data: f.data }))
      });
      setAnswer(response.data.data);
      setQuestion("");
      setFiles([]);
      await loadMeta();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to get AI response.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(event) {
    const selected = Array.from(event.target.files);
    
    const filesToProcess = selected.slice(0, 3);
    
    const readers = filesToProcess.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            mimeType: file.type,
            data: e.target.result
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(base64Files => {
      setFiles(base64Files);
    }).catch(() => {
      setError("Failed to process attached files.");
    });
  }

  async function handleDeleteHistoryItem(historyId) {
    const confirmed = window.confirm("Are you sure you want to delete this AI history item?");
    if (!confirmed) {
      return;
    }
    setHistoryBusyId(historyId);
    setError("");

    try {
      await apiClient.delete(`/ai/history/${historyId}`);
      setHistory((current) => current.filter((item) => item._id !== historyId));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete AI history item.");
    } finally {
      setHistoryBusyId("");
    }
  }

  async function handleClearHistory() {
    const confirmed = window.confirm("Are you sure you want to clear all your AI history? This cannot be undone.");
    if (!confirmed) {
      return;
    }
    setHistoryBusyId("all");
    setError("");

    try {
      await apiClient.delete("/ai/history");
      setHistory([]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to clear AI history.");
    } finally {
      setHistoryBusyId("");
    }
  }

  return (
    <div className="page-stack">
      <div className="panel-card">
        AI Q&A is active with provider verification, uploaded-resource grounding, and saved student history.
      </div>



      <SectionCard
        title="AI Learning Engine"
        description="Ask academic questions and get clean, category-wise answers."
        variant="hero"
      >
        <form className="panel-form" onSubmit={handleAsk}>
          <label className="auth-field">
            <span>Intent</span>
            <select value={intent} onChange={(event) => setIntent(event.target.value)}>
              <option value="general">General Q&A</option>
              <option value="lecture-summary">Lecture Summary</option>
              <option value="pyq-answer">PYQ Answering</option>
              <option value="study-recommendations">Study Recommendations</option>
            </select>
          </label>

          <label className="auth-field">
            <span>Ask your question</span>
            <textarea
              className="panel-textarea"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Example: Summarize the uploaded DBMS lecture and connect it with PYQ topics."
              required
              rows={4}
              value={question}
            />
          </label>

          <label className="auth-field">
            <span>Attach Screenshots / PDFs (Max 3)</span>
            <input 
              type="file" 
              multiple 
              accept="image/png,image/jpeg,application/pdf"
              onChange={handleFileChange}
              style={{ padding: '0.5rem 0' }}
            />
            {files.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {files.map((f, i) => (
                  <span key={i} style={{ background: 'var(--glass-border)', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.8rem', color: 'var(--color-text)' }}>
                    📎 {f.name}
                  </span>
                ))}
              </div>
            )}
          </label>
          <button className="auth-submit" disabled={loading} type={user ? "submit" : "button"} onClick={user ? undefined : handleAsk}>
            {loading ? (
              <span className="btn-spinner-container">
                <Spinner size="sm" /> Generating...
              </span>
            ) : (
              user ? "Ask AI" : "Ask AI 🔒"
            )}
          </button>
        </form>
        {error ? <p className="auth-error">{error}</p> : null}
      </SectionCard>

      {answer ? (
        <SectionCard title={answer.title || "AI Answer"} description={answer.summary || ""}>
          <div className="panel-list">
            {(answer.categories || []).map((section) => (
              <article className="panel-card" key={section.heading}>
                <h3>{section.heading}</h3>
                <ul className="ai-points">
                  {(section.points || []).map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {answer.debug ? (
            <article className="panel-card">
              <p className="muted">Debug: {answer.debug}</p>
            </article>
          ) : null}
        </SectionCard>
      ) : null}

      {user ? (
        <SectionCard
          title="My AI History"
          description="Recent questions and answers saved for this student account."
        >
        {history.length ? (
          <div className="panel-actions">
            <button
              className="action-button reject"
              disabled={historyBusyId === "all"}
              onClick={handleClearHistory}
              type="button"
            >
              {historyBusyId === "all" ? "Clearing..." : "Clear History"}
            </button>
          </div>
        ) : null}
        {!historyLoading && !history.length ? <p className="muted">No AI history yet. Ask your first question.</p> : null}
        <div className="panel-list">
          {historyLoading ? (
            <SkeletonCard count={2} />
          ) : (
            <>
              {history.slice(0, historyLimit).map((item) => (
                <article className="panel-card" key={item._id}>
                  <h3>{item.question}</h3>
                  <p className="muted">
                    Intent: {item.intent} | Provider: {item.provider || "fallback"} | {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p className="summary-text" title={item.answer?.summary}>{item.answer?.summary}</p>
                  {item.sourceResources?.length ? (
                    <p className="muted">
                      Sources: {item.sourceResources.map((resource) => resource.title).join(" | ")}
                    </p>
                  ) : null}
                  <div className="panel-actions">
                    <button
                      className="action-button reject"
                      disabled={historyBusyId === item._id}
                      onClick={() => handleDeleteHistoryItem(item._id)}
                      type="button"
                    >
                      {historyBusyId === item._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
              {history.length > historyLimit ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                  <button className="open-college-button" onClick={() => setHistoryLimit(curr => curr + 3)} type="button">Load More</button>
                </div>
              ) : null}
              {historyLimit > 3 && history.length <= historyLimit ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                  <button className="open-college-button" onClick={() => setHistoryLimit(3)} type="button">Show Less</button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </SectionCard>
      ) : null}
    </div>
  );
}
