import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";
import { useToast } from "../ui/ToastContext";

export function QuizResultsPage() {
  const { quizId } = useParams();
  const { showError } = useToast();
  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const response = await apiClient.get(`/quizzes/${quizId}/results`);
        if (!ignore) {
          setQuiz(response.data.data.quiz);
          setResults(response.data.data.results);
          setLoading(false);
        }
      } catch (error) {
        if (!ignore) {
          showError(error.response?.data?.message || "Failed to load quiz results.");
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [quizId, showError]);

  if (loading) {
    return (
      <div className="page-stack">
        <SectionCard title="Loading Results" description="Fetching quiz performance data..." />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="page-stack">
        <SectionCard title="Error" description="Quiz not found or access denied." />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <SectionCard
        title={`Results: ${quiz.title}`}
        description={`${quiz.collegeName} | ${quiz.programId} | ${quiz.mode} | ${quiz.difficulty} | ${quiz.duration}`}
      >
        <div className="detail-header" style={{ marginBottom: "1.5rem" }}>
          <div>
            <p className="program-badge">Quiz Submissions</p>
            <h3>Total Questions: {results[0]?.totalQuestions || 0}</h3>
            <p className="muted">
              Total Submissions: {results.length} | Status: {quiz.isEnded ? "Ended" : (quiz.isPublished ? "Published" : "Draft")}
            </p>
          </div>
          <Link className="back-link" to="/representative">
            Back to Panel
          </Link>
        </div>

        {results.length === 0 ? (
          <p className="muted">No students have submitted this quiz yet.</p>
        ) : (
          <div className="panel-list" style={{ marginTop: "1.5rem", overflowX: "auto" }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#374151' }}>Student Name</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#374151' }}>College ID</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#374151' }}>Correct</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#374151' }}>Wrong</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600, color: '#374151' }}>Not Attempted</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res) => (
                  <tr key={res._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', color: '#111827' }}>{res.studentName}</td>
                    <td style={{ padding: '0.75rem', color: '#4b5563' }}>{res.collegeId}</td>
                    <td style={{ padding: '0.75rem', color: '#10b981', fontWeight: 500 }}>{res.correctCount}</td>
                    <td style={{ padding: '0.75rem', color: '#ef4444', fontWeight: 500 }}>{res.wrongCount}</td>
                    <td style={{ padding: '0.75rem', color: '#6b7280' }}>{res.unattemptedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
