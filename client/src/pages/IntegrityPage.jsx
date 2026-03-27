import { SectionCard } from "../components/SectionCard";
import { mockIntegrityCases } from "../features/integrity/mockIntegrity";

export function IntegrityPage() {
  return (
    <div className="page-stack">
      <SectionCard
        title="Plagiarism & Quality Control"
        description="Similarity checks across uploaded notes and public academic sources with contributor history awareness."
      >
        <div className="table">
          {mockIntegrityCases.map((item) => (
            <article className="table-row" key={item.title}>
              <div>
                <h3>{item.title}</h3>
                <p className="muted">{item.source}</p>
              </div>
              <div>
                <p>{item.score}</p>
                <p className="muted">{item.status}</p>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
