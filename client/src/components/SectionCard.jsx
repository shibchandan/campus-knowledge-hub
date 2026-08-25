import React from "react";

export const SectionCard = React.memo(function SectionCard({ title, description, children, variant = "default", kicker }) {
  const cardClass = variant === "hero" ? "card hero-card" : "card";
  return (
    <section className={cardClass}>
      <div className="card-header">
        <div>
          {kicker && <p className="card-kicker">{kicker}</p>}
          <h2>{title}</h2>
          {description ? <p className="muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
});
