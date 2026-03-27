import { SectionCard } from "../components/SectionCard";
import { mockResources } from "../features/notes/mockResources";

export function NotesPage() {
  return (
    <div className="page-stack">
      <SectionCard
        title="Notes, Books & PYQs"
        description="Versioned academic resources categorized by course, semester, and faculty."
      >
        <div className="table">
          {mockResources.map((resource) => (
            <article className="table-row" key={resource.title}>
              <div>
                <h3>{resource.title}</h3>
                <p className="muted">
                  {resource.type} • {resource.course} • {resource.semester}
                </p>
              </div>
              <div>
                <p>{resource.professor}</p>
                <p className="muted">{resource.version}</p>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
