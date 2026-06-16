export function SectionCard({ title, description, children, variant = "default" }) {
  const cardClass = variant === "hero" ? "card hero-card" : "card";
  return (
    <section className={cardClass}>
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
