import { useEffect, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ui/ToastContext";
import { useNavigate } from "react-router-dom";

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const oneDay = 86400000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return `Today, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  }

  if (diff < oneDay * 2 && date.getDate() === now.getDate() - 1) {
    return `Yesterday, ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  }

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  return `${mins} min`;
}

export function LecturesPage() {
  const { user } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();
  const { selectedCollege } = useCollege();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadLectures() {
      setLoading(true);
      try {
        const response = await apiClient.get("/lectures");
        setLectures(response.data.data || []);
      } catch {
        setLectures([]);
      } finally {
        setLoading(false);
      }
    }

    loadLectures();
  }, [selectedCollege?.name]);

  const filtered = lectures.filter((lecture) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      lecture.title?.toLowerCase().includes(term) ||
      lecture.subject?.toLowerCase().includes(term) ||
      lecture.topic?.toLowerCase().includes(term) ||
      lecture.semester?.toLowerCase().includes(term)
    );
  });

  const hasRealData = lectures.length > 0;

  return (
    <div className="page-stack">
      <SectionCard
        title="Lecture Library"
        description="Secure professor-uploaded video lectures with subject, topic, semester, and date metadata."
      >
        <div className="list-toolbar">
          <input
            className="college-search"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search lecture by title, subject, topic..."
            type="text"
            value={searchTerm}
          />
          <p className="muted">{filtered.length} lectures found</p>
        </div>

        {loading ? (
          <p className="muted">Loading lectures...</p>
        ) : !hasRealData ? (
          <div className="lecture-empty-state">
            <span className="lecture-empty-icon">🎥</span>
            <h3>No Lectures Yet</h3>
            <p className="muted">
              No lectures have been uploaded for this workspace yet. Representatives and admins can upload video lectures from the panel.
            </p>
          </div>
        ) : (
          <div className="lecture-grid">
            {filtered.map((lecture) => (
              <article className="lecture-card-enhanced" key={lecture._id}>
                <div className="lecture-card-accent" />
                <div className="lecture-card-body">
                  <div className="lecture-card-top-row">
                    <span className="lecture-card-icon">🎬</span>
                    <span className="lecture-subject-tag">{lecture.subject}</span>
                    {lecture.semester && (
                      <span className="lecture-semester-tag">{lecture.semester}</span>
                    )}
                  </div>
                  <h3 className="lecture-card-title">{lecture.title}</h3>
                  <p className="muted lecture-card-meta">
                    {lecture.topic && <span>📌 {lecture.topic}</span>}
                  </p>
                  <div className="lecture-card-details">
                    <span className="lecture-detail-item">
                      👤 {lecture.professor?.fullName || "Unknown Professor"}
                    </span>
                    <span className="lecture-detail-item">
                      📅 {formatDate(lecture.lectureDate)}
                    </span>
                    {lecture.bookmarks?.length > 0 && (
                      <span className="lecture-detail-item">
                        🔖 {lecture.bookmarks.length} bookmarks
                      </span>
                    )}
                  </div>
                </div>
                <div className="lecture-card-footer">
                  <div className="lecture-footer-left">
                    {lecture.allowDownload && (
                      <span className="lecture-download-badge">📥 Downloadable</span>
                    )}
                  </div>
                  {lecture.videoUrl ? (
                    user ? (
                      <a
                        href={lecture.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="lecture-watch-btn"
                      >
                        Watch Lecture →
                      </a>
                    ) : (
                      <button
                        className="lecture-watch-btn"
                        onClick={() => {
                          showError("Please log in to watch lectures.");
                          navigate("/login");
                        }}
                        type="button"
                      >
                        Watch Lecture 🔒
                      </button>
                    )
                  ) : (
                    <span className="lecture-watch-btn disabled">No Video</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
