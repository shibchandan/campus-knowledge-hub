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
      <SectionCard
        title="Student Panel"
        description="View admin-approved colleges and courses available on the platform."
      >
        {error ? <p className="auth-error">{error}</p> : null}
        <div className="stat-grid">
          {stats.map((item) => (
            <article className="stat-card" key={item.label}>
              <p className="stat-label">{item.label}</p>
              <h3>{item.value}</h3>
              <p className="muted">{item.note}</p>
            </article>
          ))}
        </div>
      </SectionCard>

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
