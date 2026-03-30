import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { getQuizArrangementById } from "../features/notes/mockResources";
import { apiClient } from "../lib/apiClient";

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
  const fallbackQuiz = getQuizArrangementById(quizId);
  const [dynamicQuiz, setDynamicQuiz] = useState(null);
  const [loading, setLoading] = useState(Boolean(quizId));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const quiz = dynamicQuiz || fallbackQuiz;

  useEffect(() => {
    let ignore = false;

    async function loadQuiz() {
      setLoading(true);

      try {
        const response = await apiClient.get(`/quizzes/${quizId}`);
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
  }, [quizId]);

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
    return <Navigate to="/notes" replace />;
  }

  const score = quiz.questions.reduce((total, item, index) => {
    const chosen = selectedAnswers[index];
    return total + Number(chosen === item.answer);
  }, 0);

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
  }

  function handleSubmitQuiz() {
    setSubmitted(true);
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
          </div>
          <Link className="back-link" to="/notes">
            Back to Notes
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
            <h3>Score</h3>
            <p>{submitted ? `${score} / ${totalQuestions}` : "Not submitted yet"}</p>
          </article>
        </div>
        <div className="panel-actions">
          <button className="auth-submit" onClick={handleSubmitQuiz} type="button">
            Submit Arrangement
          </button>
        </div>
        {submitted ? (
          <article className="panel-card">
            <h3>Result Insight</h3>
            <p>
              You scored {score} out of {totalQuestions}. Review the highlighted correct answers and retry for stronger revision.
            </p>
          </article>
        ) : null}
      </SectionCard>
    </div>
  );
}
