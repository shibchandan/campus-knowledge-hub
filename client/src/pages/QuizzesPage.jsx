import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/ToastContext";

export function QuizzesPage() {
  const { user } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();
  const { selectedCollege } = useCollege();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadQuizzes() {
      if (!selectedCollege?.name) {
        setQuizzes([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await apiClient.get("/quizzes", {
          params: { collegeName: selectedCollege.name }
        });

        if (!ignore) {
          setQuizzes(response.data.data || []);
        }
      } catch {
        if (!ignore) {
          setQuizzes([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadQuizzes();

    return () => {
      ignore = true;
    };
  }, [selectedCollege?.name]);

  if (!selectedCollege?.name) {
    return (
      <div className="page-stack">
        <SectionCard title="Quiz Arena" variant="hero">
          <div className="lecture-empty-state" style={{ padding: '2rem 0' }}>
            <span className="lecture-empty-icon">🏛️</span>
            <p className="muted" style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
              Select a college from the Colleges page to view available quizzes.
            </p>
            <Link to="/colleges" className="action-button approve" style={{ display: 'inline-flex', alignItems: 'center' }}>
              Go to Colleges
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <SectionCard
        title="Quiz Arena"
        description="Representative-created quizzes for the selected college only."
        variant="hero"
      >
        <p className="muted">
          Showing quiz arrangements for <strong>{selectedCollege.name}</strong>.
        </p>
        <p className="muted">{loading ? "Loading quizzes..." : `${quizzes.length} quizzes available`}</p>
      </SectionCard>

      <SectionCard
        title="Available Quizzes"
        description="Open published quizzes connected to this college and start practice separately from notes."
      >
        {loading ? <p className="muted">Preparing quiz list...</p> : null}
        {!loading && !quizzes.length ? (
          <p className="muted">No published quizzes are available yet for this college.</p>
        ) : null}
        <div className="quiz-arrangement-grid">
          {quizzes.map((quiz) => (
            <article className="quiz-arrangement-card" key={quiz._id}>
              <div className="resource-card-top">
                <p className="program-badge">Quiz Mode</p>
                <p className="resource-count">{quiz.duration}</p>
              </div>
              <h3>{quiz.title}</h3>
              <p className="muted">
                Difficulty: {quiz.difficulty} | Style: {quiz.mode}
              </p>
              <p>{quiz.note || "Representative-created college quiz arrangement."}</p>
              {quiz.resourceMatch ? <p className="muted">Based on: {quiz.resourceMatch}</p> : null}
              <div className="panel-actions">
                {user ? (
                  <Link
                    className="open-college-button"
                    to={`/quizzes/${quiz._id}?collegeName=${encodeURIComponent(selectedCollege.name)}`}
                  >
                    Start Quiz
                  </Link>
                ) : (
                  <button
                    className="open-college-button"
                    onClick={() => {
                      showError("Please log in to start quizzes.");
                      navigate("/login");
                    }}
                    type="button"
                  >
                    Start Quiz 🔒
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
