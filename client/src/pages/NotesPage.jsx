import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCollege } from "../college/CollegeContext";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";
import {
  mockResources,
  notesOverviewStats,
  quizArrangements
} from "../features/notes/mockResources";

export function NotesPage() {
  const { selectedCollege } = useCollege();
  const [dynamicQuizzes, setDynamicQuizzes] = useState([]);
  const [quizLoading, setQuizLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadQuizzes() {
      setQuizLoading(true);

      try {
        const response = await apiClient.get("/quizzes", {
          params: selectedCollege?.name ? { collegeName: selectedCollege.name } : {}
        });

        if (!ignore) {
          setDynamicQuizzes(response.data.data || []);
        }
      } catch {
        if (!ignore) {
          setDynamicQuizzes([]);
        }
      } finally {
        if (!ignore) {
          setQuizLoading(false);
        }
      }
    }

    loadQuizzes();

    return () => {
      ignore = true;
    };
  }, [selectedCollege?.name]);

  const displayedQuizzes = useMemo(
    () => (dynamicQuizzes.length ? dynamicQuizzes : quizArrangements),
    [dynamicQuizzes]
  );

  return (
    <div className="page-stack">
      <SectionCard
        title="Notes, Books & PYQs"
        description="A guided study shelf with revision-ready notes, solved PYQs, and arranged quiz practice."
      >
        <div className="stat-grid compact-stat-grid">
          {notesOverviewStats.map((item) => (
            <article className="stat-card" key={item.label}>
              <p className="stat-label">{item.label}</p>
              <h3>{item.value}</h3>
              <p className="muted">{item.caption}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Smart Resource Shelf"
        description="Pick the strongest notes and PYQs first, then move into targeted practice."
      >
        <div className="notes-resource-grid">
          {mockResources.map((resource) => (
            <article className="notes-resource-card" key={resource.title}>
              <div className="resource-card-top">
                <p className="resource-badge">{resource.type}</p>
                <p className="resource-count">{resource.version}</p>
              </div>
              <h3>{resource.title}</h3>
              <p className="muted">
                {resource.course} | {resource.semester}
              </p>
              <p className="muted">
                Faculty: {resource.professor} | Format: {resource.format}
              </p>
              <div className="panel-subsection">
                <p className="stat-label">Coverage</p>
                <p>{resource.coverage}</p>
              </div>
              <div className="notes-focus-wrap">
                {resource.quizFocus.map((focus) => (
                  <span className="notes-focus-chip" key={focus}>
                    {focus}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Custom Quiz Arrangement"
        description="Organized quiz styles made from notes and PYQ patterns so students can revise with purpose."
      >
        {quizLoading ? <p className="muted">Loading quiz arrangements...</p> : null}
        <div className="quiz-arrangement-grid">
          {displayedQuizzes.map((quiz) => (
            <article className="quiz-arrangement-card" key={quiz._id || quiz.id || quiz.title}>
              <div className="resource-card-top">
                <p className="program-badge">Quiz Mode</p>
                <p className="resource-count">{quiz.duration}</p>
              </div>
              <h3>{quiz.title}</h3>
              <p className="muted">
                Difficulty: {quiz.difficulty} | Style: {quiz.mode}
              </p>
              <p>{quiz.note || "Representative-created practice arrangement for focused revision."}</p>
              {quiz.resourceMatch ? <p className="muted">Based on: {quiz.resourceMatch}</p> : null}
              <div className="panel-actions">
                <Link className="open-college-button" to={`/notes/quiz/${quiz._id || quiz.id}`}>
                  Start Arrangement
                </Link>
                <Link className="action-button neutral" to={`/notes/quiz/${quiz._id || quiz.id}`}>
                  Save Plan
                </Link>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
