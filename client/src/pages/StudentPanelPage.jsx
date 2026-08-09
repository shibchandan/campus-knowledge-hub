import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { SkeletonCard } from "../components/LoadingStates";
import { SearchInput } from "../components/SearchInput";
import { HighlightText } from "../components/HighlightText";
import { useDebounce } from "../hooks/useDebounce";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "../auth/AuthContext";
import { Link } from "react-router-dom";

export function StudentPanelPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [sortBy, setSortBy] = useState("college-asc");

  useEffect(() => {
    async function loadApproved() {
      setLoading(true);
      setError("");

      try {
        const response = await apiClient.get("/governance/approved-courses");
        setCourses(response.data.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load approved colleges.");
      } finally {
        setLoading(false);
      }
    }

    loadApproved();
  }, []);

  const filteredCourses = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const items = courses.filter((item) => {
      if (!term) {
        return true;
      }

      return (
        item.collegeName.toLowerCase().includes(term) ||
        item.courseName.toLowerCase().includes(term) ||
        (item.addedByRepresentative?.fullName || "").toLowerCase().includes(term)
      );
    });

    items.sort((left, right) => {
      if (sortBy === "semester-desc") {
        return right.semesterCount - left.semesterCount;
      }

      if (sortBy === "course-asc") {
        return left.courseName.localeCompare(right.courseName);
      }

      return left.collegeName.localeCompare(right.collegeName);
    });

    return items;
  }, [courses, debouncedSearch, sortBy]);

  const stats = useMemo(
    () => [
      {
        label: "Approved Colleges",
        value: new Set(courses.map((item) => item.collegeName)).size,
        note: "Student-visible institutions"
      },
      {
        label: "Course Entries",
        value: courses.length,
        note: "Approved academic listings"
      },
      {
        label: "Longest Program",
        value: courses.length ? `${Math.max(...courses.map((item) => item.semesterCount))} semesters` : "0",
        note: "Useful for planning"
      }
    ],
    [courses]
  );

  return (
    <div className="page-stack">
      {(!user?.collegeName || user?.studentVerificationStatus === "pending") && (
        <div className="status-banner warning" style={{ marginBottom: "1.5rem", padding: "1rem", borderRadius: "8px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
          <p style={{ color: "var(--color-amber-500-adaptive, #d97706)", fontWeight: "var(--fw-head)", margin: 0 }}>
            ⚠️ {!user?.collegeName 
              ? <span>Action Required: Please go to <Link to="/account" style={{ color: "inherit", textDecoration: "underline" }}>Account Settings</Link> to submit your college details and unlock your dashboard.</span>
              : "Your college verification is currently pending admin approval. Some features may be restricted."
            }
          </p>
        </div>
      )}
      <section className="overview-hero-band">
        <div className="overview-hero-main">
          <div className="overview-hero-header">
            <span className="overview-eyebrow-chip">
              <span>🎓</span>
              <span>Student Panel</span>
            </span>
            <h1 className="overview-hero-title">
              {user?.collegeName ? `${user.collegeName} Hub` : "Student Dashboard"}
            </h1>
            <p className="overview-hero-subtitle">
              View admin-approved colleges and courses available on the platform.
            </p>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <div className="overview-stat-strip">
            {stats.map((item, index) => {
              const statIcons = ["🏫", "📚", "⏳"];
              const statColors = ["#6366f1", "#10b981", "#f59e0b"];
              const statGradients = [
                "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.03))",
                "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.03))",
                "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.03))",
              ];
              return (
                <article
                  className="overview-stat-tile"
                  key={item.label}
                  style={{ background: statGradients[index], borderColor: `${statColors[index]}30` }}
                >
                  <div className="stat-tile-accent" style={{ background: statColors[index] }} />
                  <div className="stat-tile-header">
                    <span className="stat-tile-icon" style={{ background: `${statColors[index]}20`, color: statColors[index] }}>
                      {statIcons[index]}
                    </span>
                    <p className="overview-stat-label">{item.label}</p>
                  </div>
                  <h2 className="stat-tile-value" style={{ color: statColors[index] }}>{item.value}</h2>
                  <p className="stat-tile-note">{item.note}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <SectionCard
        title="Approved Course Directory"
        description="Search and sort what students can currently access."
      >
        <div className="toolbar-grid">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
            isPending={search !== debouncedSearch}
            placeholder="Search college, course, or representative..."
          />
          <select
            className="college-search"
            onChange={(event) => setSortBy(event.target.value)}
            value={sortBy}
          >
            <option value="college-asc">Sort by college</option>
            <option value="course-asc">Sort by course</option>
            <option value="semester-desc">Sort by semester count</option>
          </select>
        </div>

        {loading ? <SkeletonCard count={3} /> : null}
        {!loading && filteredCourses.length === 0 ? (
          debouncedSearch ? (
            <div className="search-empty-state" style={{ padding: "2rem", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.1)" }}>
              <p className="muted" style={{ marginBottom: "0.5rem" }}>No results found for "{debouncedSearch}"</p>
              <p style={{ fontSize: "0.875rem", color: "var(--color-slate-400-adaptive)" }}>Check for typos or try searching by a different term.</p>
            </div>
          ) : (
            <p className="muted">No approved college-course data available yet.</p>
          )
        ) : null}
        <div className="panel-list">
          {filteredCourses.map((item) => (
            <article className="panel-card" key={item._id}>
              <h3><HighlightText text={item.collegeName} highlight={debouncedSearch} /></h3>
              <p className="muted">
                Course: <HighlightText text={item.courseName} highlight={debouncedSearch} /> | Semesters: {item.semesterCount}
              </p>
              <p className="muted">Added by: <HighlightText text={item.addedByRepresentative?.fullName || "Representative"} highlight={debouncedSearch} /></p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
