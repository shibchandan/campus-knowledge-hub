export function SectionCard({ title, description, children }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <p className="card-kicker">Workspace Section</p>
          <h2>{title}</h2>
          {description ? <p className="muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
