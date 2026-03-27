export function StatGrid({ items }) {
  return (
    <div className="stat-grid">
      {items.map((item) => (
        <article className="stat-card" key={item.label}>
          <p className="stat-label">{item.label}</p>
          <h3>{item.value}</h3>
          <p className="muted">{item.caption}</p>
        </article>
      ))}
    </div>
  );
}
