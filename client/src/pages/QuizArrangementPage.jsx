import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { getQuizArrangementById } from "../features/notes/mockResources";
import { apiClient } from "../lib/apiClient";
import { useCollege } from "../college/CollegeContext";
import { useToast } from "../ui/ToastContext";
import { useAuth } from "../auth/AuthContext";

const QUIZ_PLAN_STORAGE_KEY = "campus-knowledge-hub-quiz-plans";

function readSavedPlans() {
  try {
    const raw = localStorage.getItem(QUIZ_PLAN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlanToStorage(plan) {
  const existing = readSavedPlans();
  const deduped = existing.filter((item) => item.id !== plan.id);
  localStorage.setItem(QUIZ_PLAN_STORAGE_KEY, JSON.stringify([plan, ...deduped]));
}

export function QuizArrangementPage() {
  const { quizId } = useParams();
  const [searchParams] = useSearchParams();
  const { selectedCollege } = useCollege();
  const { showInfo, showSuccess } = useToast();
  const { user } = useAuth();
  const fallbackQuiz = getQuizArrangementById(quizId);
  const [dynamicQuiz, setDynamicQuiz] = useState(null);
  const [loading, setLoading] = useState(Boolean(quizId));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  
  const [studentName, setStudentName] = useState(user?.fullName || "");
  const [collegeId, setCollegeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const quiz = dynamicQuiz || fallbackQuiz;
  const collegeName = searchParams.get("collegeName") || selectedCollege?.name || "";

  useEffect(() => {
    if (!quiz || !quiz.questions || submitted) return;
    if (quiz.timerMinutes && timeLeft === null) {
      setTimeLeft(quiz.timerMinutes * 60);
    }
  }, [quiz, submitted, timeLeft]);

  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) {
      handleSubmitQuiz();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  useEffect(() => {
    let ignore = false;

    async function loadQuiz() {
      if (!collegeName && !fallbackQuiz) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await apiClient.get(`/quizzes/${quizId}`, {
          params: collegeName ? { collegeName } : {}
        });
        if (!ignore) {
          setDynamicQuiz(response.data.data || null);
        }
      } catch {
        if (!ignore) {
          setDynamicQuiz(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadQuiz();

    return () => {
      ignore = true;
    };
  }, [collegeName, fallbackQuiz, quizId]);

  const question = useMemo(() => quiz?.questions?.[currentIndex], [currentIndex, quiz]);
  const totalQuestions = quiz?.questions?.length || 0;

  if (loading && !quiz) {
    return (
      <div className="page-stack">
        <SectionCard title="Quiz Arrangement" description="Loading the selected arrangement...">
          <p className="muted">Preparing quiz workspace...</p>
        </SectionCard>
      </div>
    );
  }

  if (!quiz) {
    return <Navigate to="/quizzes" replace />;
  }

  const isLocked = user?.role === "student" && (!quiz?.questions || quiz.questions.length === 0) && quiz.questionsCount > 0;

  async function handleUnlock(event) {
    event.preventDefault();
    setUnlockError("");
    setUnlockLoading(true);
    try {
      const response = await apiClient.post(`/quizzes/${quizId}/start`, {
        accessPassword: unlockPassword
      });
      setDynamicQuiz(response.data.data);
      showSuccess("Quiz unlocked successfully.");
    } catch (error) {
      setUnlockError(error.response?.data?.message || "Invalid PIN.");
    } finally {
      setUnlockLoading(false);
    }
  }

  if (isLocked) {
    return (
      <div className="page-stack">
        <SectionCard title="Secure Quiz Area" description="This quiz is protected and requires a PIN from your representative to start.">
          {unlockError ? <p className="auth-error">{unlockError}</p> : null}
          <form className="panel-form" onSubmit={handleUnlock}>
            <div className="panel-form-grid">
              <label className="auth-field">
                <span>Quiz PIN</span>
                <input
                  onChange={(event) => setUnlockPassword(event.target.value)}
                  placeholder="Enter the PIN to start"
                  required
                  type="text"
                  value={unlockPassword}
                />
              </label>
            </div>
            <button className="auth-submit" disabled={unlockLoading} type="submit">
              {unlockLoading ? "Verifying..." : "Unlock Quiz"}
            </button>
          </form>
        </SectionCard>
      </div>
    );
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="page-stack">
        <SectionCard title="Quiz Unavailable" description="This quiz has no questions or is incomplete." />
      </div>
    );
  }

  // We no longer calculate a score locally since it is done by the backend
  // and we don't display a single score field.

  function handleSelect(option) {
    setSelectedAnswers((current) => ({
      ...current,
      [currentIndex]: option
    }));
  }

  function handleSavePlan() {
    savePlanToStorage({
      id: quiz._id || quiz.id,
      title: quiz.title,
      savedAt: new Date().toISOString(),
      duration: quiz.duration,
      difficulty: quiz.difficulty
    });
    setSaved(true);
    showSuccess("Quiz plan saved.");
  }

  async function handleSubmitQuiz() {
    setSubmitting(true);
    try {
      const response = await apiClient.post(`/quizzes/${quiz._id || quiz.id}/submit`, {
        studentName,
        collegeId,
        selectedAnswers
      });
      setResult(response.data.data);
      setSubmitted(true);
      showSuccess("Quiz submitted successfully.");
    } catch (error) {
      showError(error.response?.data?.message || "Failed to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <SectionCard
        title={quiz.title}
        description={`${quiz.mode} | ${quiz.difficulty} | ${quiz.duration} | Based on ${quiz.resourceMatch}`}
      >
        <div className="detail-header">
          <div>
            <p className="program-badge">Quiz Arrangement</p>
            <h3>{quiz.note}</h3>
            <p className="muted">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
            {timeLeft !== null && !submitted ? (
              <p className="status-chip pending" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </p>
            ) : null}
          </div>
          <Link className="back-link" to="/quizzes">
            Back to Quizzes
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Quiz Workspace"
        description="Answer the arranged quiz dynamically and review your score instantly."
      >
        <article className="quiz-workspace-card">
          <p className="stat-label">Prompt</p>
          <h3>{question.prompt}</h3>
          <div className="quiz-option-list">
            {question.options.map((option) => {
              const isSelected = selectedAnswers[currentIndex] === option;
              const isCorrect = submitted && option === question.answer;
              const isWrongSelection = submitted && isSelected && option !== question.answer;

              return (
                <button
                  className={`quiz-option-button${isSelected ? " selected" : ""}${isCorrect ? " correct" : ""}${isWrongSelection ? " wrong" : ""}`}
                  key={option}
                  onClick={() => handleSelect(option)}
                  type="button"
                >
                  {option}
                </button>
              );
            })}
          </div>
          <div className="panel-actions">
            <button
              className="action-button neutral"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((current) => current - 1)}
              type="button"
            >
              Previous
            </button>
            <button className="action-button approve" onClick={handleSavePlan} type="button">
              {saved ? "Plan Saved" : "Save Plan"}
            </button>
            <button
              className="open-college-button"
              disabled={currentIndex === totalQuestions - 1}
              onClick={() => setCurrentIndex((current) => current + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </article>
      </SectionCard>

      <SectionCard
        title="Arrangement Summary"
        description="Submit the quiz anytime and review the dynamic score."
      >
        <div className="detail-grid">
          <article className="detail-card">
            <h3>Answered</h3>
            <p>{Object.keys(selectedAnswers).length} / {totalQuestions}</p>
          </article>
          <article className="detail-card">
            <h3>Status</h3>
            <p>{submitted ? "Submitted" : "In progress"}</p>
          </article>
          <article className="detail-card">
            <h3>Completion</h3>
            <p>{submitted ? "Done" : "Pending"}</p>
          </article>
        </div>
        
        {!submitted && (
          <div className="panel-form-grid" style={{ marginTop: "1.5rem", marginBottom: "1rem" }}>
            <label className="auth-field">
              <span>Student Name *</span>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                placeholder="Enter your name"
              />
            </label>
            <label className="auth-field">
              <span>College ID *</span>
              <input
                type="text"
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                required
                placeholder="Enter your College ID"
              />
            </label>
          </div>
        )}

        <div className="panel-actions">
          <button 
            className="auth-submit" 
            onClick={handleSubmitQuiz} 
            type="button"
            disabled={submitted || submitting || (!studentName.trim() || !collegeId.trim())}
          >
            {submitting ? "Submitting..." : "Submit Arrangement"}
          </button>
        </div>
        {submitted && result ? (
          <article className="panel-card">
            <h3>Result Insight</h3>
            <p>
              <strong>Correct:</strong> {result.correctCount} <br />
              <strong>Wrong:</strong> {result.wrongCount} <br />
              <strong>Not Attempted:</strong> {result.unattemptedCount}
            </p>
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              Review the highlighted correct answers and retry for stronger revision.
            </p>
          </article>
        ) : null}
      </SectionCard>
    </div>
  );
}
