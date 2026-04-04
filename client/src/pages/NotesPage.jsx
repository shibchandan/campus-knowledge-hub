import { Link } from "react-router-dom";
import { useCollege } from "../college/CollegeContext";
import { SectionCard } from "../components/SectionCard";
import { mockResources, notesOverviewStats } from "../features/notes/mockResources";

export function NotesPage() {
  const { selectedCollege } = useCollege();

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
    </div>
  );
}
