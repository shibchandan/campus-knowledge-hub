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
        collegeName: selectedCollege?.name || ""
      });
      setAnswer(response.data.data);
      setQuestion("");
      await loadMeta();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to get AI response.");
    } finally {
      setLoading(false);
    }
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
        description={`Ask academic questions and get clean, category-wise answers grounded on ${selectedCollege?.name || "your selected college"} resources.`}
        variant="hero"
      >
        <form className="panel-form" onSubmit={handleAsk}>
          <div className="panel-form-grid">
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
              <span>Selected College</span>
              <input disabled type="text" value={selectedCollege?.name || "No college selected"} />
            </label>
          </div>

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

          {(answer.nextSteps || []).length ? (
            <article className="panel-card">
              <h3>Next Steps</h3>
              <ul className="ai-points">
                {answer.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <p className="muted">Confidence: {answer.confidence || "medium"}</p>
              {answer.sources?.length ? (
                <p className="muted">Sources: {answer.sources.join(" | ")}</p>
              ) : null}
              {answer.contextUsed?.length ? (
                <div className="panel-subsection">
                  <h3>Campus Context Used</h3>
                  <ul className="ai-points">
                    {answer.contextUsed.map((resource) => (
                      <li key={resource.id}>
                        {resource.categoryId}: {resource.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {answer.debug ? <p className="muted">Debug: {answer.debug}</p> : null}
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
                  <p>{item.answer?.summary}</p>
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
