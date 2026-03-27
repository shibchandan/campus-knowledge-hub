import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";

export function CollegeSelectorPage() {
  const navigate = useNavigate();
  const { colleges, selectedCollege, selectCollegeById } = useCollege();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  const filteredColleges = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = colleges.filter(
      (college) =>
        !term ||
        college.name.toLowerCase().includes(term) ||
        college.shortName.toLowerCase().includes(term) ||
        college.location.toLowerCase().includes(term)
    );

    filtered.sort((left, right) => {
      if (sortBy === "location-asc") {
        return left.location.localeCompare(right.location);
      }

      if (sortBy === "short-asc") {
        return left.shortName.localeCompare(right.shortName);
      }

      return left.name.localeCompare(right.name);
    });

    return filtered;
  }, [colleges, query, sortBy]);

  function handleOpenCollege(collegeId) {
    selectCollegeById(collegeId);
    navigate("/dashboard");
  }

  return (
    <div className="page-stack">
      <SectionCard
        title="Choose College Dashboard"
        description="Filter colleges and open any college dashboard."
      >
        <div className="college-search-wrap">
          <div className="toolbar-grid">
            <input
              className="college-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search college by name or location..."
              value={query}
            />
            <select
              className="college-search"
              onChange={(event) => setSortBy(event.target.value)}
              value={sortBy}
            >
              <option value="name-asc">Sort by college name</option>
              <option value="location-asc">Sort by location</option>
              <option value="short-asc">Sort by short name</option>
            </select>
          </div>
          {selectedCollege ? (
            <p className="muted">
              Current college: <strong>{selectedCollege.name}</strong>
            </p>
          ) : (
            <p className="muted">No college selected yet.</p>
          )}
          <p className="muted">{filteredColleges.length} colleges visible</p>
        </div>
      </SectionCard>

      <SectionCard
        title="College List"
        description="Open a college and continue with your existing department/branch/semester flow."
      >
        <div className="college-grid">
          {filteredColleges.map((college) => (
            <article className="college-card" key={college.id}>
              <p className="program-badge">College</p>
              <h3>{college.name}</h3>
              <p className="muted">{college.location}</p>
              <button
                className="open-college-button"
                onClick={() => handleOpenCollege(college.id)}
                type="button"
              >
                Open Dashboard
              </button>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
