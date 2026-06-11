import { useEffect, useState, useMemo } from "react";
import { useCollege } from "../college/CollegeContext";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";
import { Link } from "react-router-dom";

const CATEGORY_LABELS = {
  notice: { label: "Notice", icon: "📢", color: "#ef4444" },
  syllabus: { label: "Syllabus", icon: "📋", color: "#8b5cf6" },
  books: { label: "Books", icon: "📚", color: "#f59e0b" },
  "class-notes": { label: "Class Notes", icon: "📝", color: "#10b981" },
  "pdf-ppt": { label: "PDF / PPT", icon: "📄", color: "#06b6d4" },
  lecture: { label: "Lecture", icon: "🎬", color: "#f97316" },
  lab: { label: "Lab", icon: "🔬", color: "#ec4899" },
  pyq: { label: "PYQ", icon: "📑", color: "#6366f1" },
  suggestion: { label: "Suggestion", icon: "💡", color: "#eab308" }
};

function getCategoryInfo(categoryId) {
  return CATEGORY_LABELS[categoryId] || { label: categoryId, icon: "📁", color: "#64748b" };
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const oneDay = 86400000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return "Today";
  }
  if (diff < oneDay * 2) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function NotesPage() {
  const { selectedCollege } = useCollege();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    async function loadResources() {
      if (!selectedCollege?.name) {
        setResources([]);
        return;
      }

      setLoading(true);
      try {
        const response = await apiClient.get("/resources", {
          params: { collegeName: selectedCollege.name }
        });
        setResources(response.data.data || []);
      } catch {
        setResources([]);
      } finally {
        setLoading(false);
      }
    }

    loadResources();
  }, [selectedCollege?.name]);

  const stats = useMemo(() => {
    const totalResources = resources.length;
    const categories = new Set(resources.map((r) => r.categoryId));
    const subjects = new Set(resources.map((r) => r.subjectId));
    const recentCount = resources.filter((r) => {
      const diff = Date.now() - new Date(r.createdAt).getTime();
      return diff < 7 * 86400000;
    }).length;

    return [
      { label: "Total Resources", value: totalResources, caption: "Notes, books, PYQs, and more", icon: "📦" },
      { label: "Categories Used", value: categories.size, caption: "Across all subject categories", icon: "🏷️" },
      { label: "Subjects Covered", value: subjects.size, caption: "With uploaded resources", icon: "📖" },
      { label: "This Week", value: recentCount, caption: "Uploaded in the last 7 days", icon: "🕐" }
    ];
  }, [resources]);

  const availableCategories = useMemo(() => {
    const cats = new Set(resources.map((r) => r.categoryId));
    return Array.from(cats).sort();
  }, [resources]);

  const filtered = useMemo(() => {
    let result = resources;

    if (categoryFilter !== "all") {
      result = result.filter((r) => r.categoryId === categoryFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.title?.toLowerCase().includes(term) ||
          r.subjectId?.toLowerCase().includes(term) ||
          r.categoryId?.toLowerCase().includes(term) ||
          r.description?.toLowerCase().includes(term)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [resources, searchTerm, categoryFilter]);

  return (
    <div className="page-stack">
      <SectionCard
        title="Notes, Books & PYQs"
        description="A guided study shelf with revision-ready notes, solved PYQs, and curated academic resources."
      >
        <div className="panel-actions">
          <Link className="action-button neutral" to="/quizzes">
            Open College Quizzes
          </Link>
        </div>
        <div className="notes-stats-grid">
          {stats.map((item) => (
            <article className="notes-stat-card" key={item.label}>
              <div className="notes-stat-header">
                <span className="notes-stat-icon">{item.icon}</span>
                <p className="notes-stat-label">{item.label}</p>
              </div>
              <h2 className="notes-stat-value">{item.value}</h2>
              <p className="muted">{item.caption}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Resource Library"
        description={selectedCollege ? `All uploaded resources for ${selectedCollege.name}.` : "Select a college to browse resources."}
      >
        <div className="notes-toolbar">
          <input
            className="college-search"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by title, subject, or category..."
            type="text"
            value={searchTerm}
          />
          <div className="notes-filter-row">
            <button
              className={`notes-filter-chip ${categoryFilter === "all" ? "active" : ""}`}
              onClick={() => setCategoryFilter("all")}
              type="button"
            >
              All
            </button>
            {availableCategories.map((cat) => {
              const info = getCategoryInfo(cat);
              return (
                <button
                  className={`notes-filter-chip ${categoryFilter === cat ? "active" : ""}`}
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  type="button"
                >
                  {info.icon} {info.label}
                </button>
              );
            })}
          </div>
          <p className="muted">{filtered.length} resources found</p>
        </div>

        {loading ? (
          <p className="muted">Loading resources...</p>
        ) : !selectedCollege ? (
          <div className="lecture-empty-state">
            <span className="lecture-empty-icon">🏫</span>
            <h3>Select a College</h3>
            <p className="muted">Choose a college from the Colleges page to browse its uploaded resources.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="lecture-empty-state">
            <span className="lecture-empty-icon">📭</span>
            <h3>No Resources Found</h3>
            <p className="muted">
              {searchTerm || categoryFilter !== "all"
                ? "No resources match your current filter. Try adjusting your search or category."
                : "No resources have been uploaded for this college yet. Upload them from the subject resource page."}
            </p>
          </div>
        ) : (
          <div className="notes-resource-grid notes-grid-enhanced">
            {filtered.map((resource) => {
              const catInfo = getCategoryInfo(resource.categoryId);
              return (
                <article className="notes-card-enhanced" key={resource._id}>
                  <div className="notes-card-accent" style={{ background: `linear-gradient(90deg, ${catInfo.color}, ${catInfo.color}88)` }} />
                  <div className="notes-card-body">
                    <div className="notes-card-top-row">
                      <span className="notes-card-icon">{catInfo.icon}</span>
                      <span className="notes-card-category" style={{ background: `${catInfo.color}15`, color: catInfo.color }}>
                        {catInfo.label}
                      </span>
                      {resource.visibility === "protected" && (
                        <span className="notes-card-locked">🔒</span>
                      )}
                    </div>
                    <h3 className="notes-card-title">{resource.title}</h3>
                    {resource.description && (
                      <p className="muted notes-card-desc">{resource.description}</p>
                    )}
                    <div className="notes-card-details">
                      <span className="notes-detail-item">📖 {resource.subjectId}</span>
                      <span className="notes-detail-item">📅 {resource.semesterId}</span>
                      {resource.fileSize > 0 && (
                        <span className="notes-detail-item">💾 {formatFileSize(resource.fileSize)}</span>
                      )}
                      <span className="notes-detail-item">🕐 {formatDate(resource.createdAt)}</span>
                    </div>
                  </div>
                  <div className="notes-card-footer">
                    <span className="notes-footer-type">
                      {resource.fileOriginalName || "Text content"}
                    </span>
                    {resource.fileUrl ? (
                      <a
                        href={`${apiClient.defaults.baseURL}/resources/${resource._id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        className="notes-view-btn"
                      >
                        View File →
                      </a>
                    ) : (
                      <span className="notes-view-btn">Text Only</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
