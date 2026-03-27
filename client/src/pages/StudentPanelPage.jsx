import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";

export function StudentPanelPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
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
    const term = search.trim().toLowerCase();
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
  }, [courses, search, sortBy]);

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
          <input
            className="college-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search college, course, or representative..."
            type="text"
            value={search}
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

        {loading ? <p className="muted">Loading approved data...</p> : null}
        {!loading && filteredCourses.length === 0 ? (
          <p className="muted">No approved college-course data available yet.</p>
        ) : null}
        <div className="panel-list">
          {filteredCourses.map((item) => (
            <article className="panel-card" key={item._id}>
              <h3>{item.collegeName}</h3>
              <p className="muted">
                Course: {item.courseName} | Semesters: {item.semesterCount}
              </p>
              <p className="muted">Added by: {item.addedByRepresentative?.fullName || "Representative"}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
