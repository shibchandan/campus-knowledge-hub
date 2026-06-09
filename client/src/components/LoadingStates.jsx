import React from "react";

export function Spinner({ size = "md", className = "" }) {
  return <div className={`spinner ${size} ${className}`} />;
}

export function SkeletonCard({ count = 1, height }) {
  const cards = Array.from({ length: count });

  return (
    <>
      {cards.map((_, idx) => (
        <article
          className="skeleton-card"
          key={idx}
          style={height ? { height } : undefined}
        >
          <div className="skeleton-line title" />
          <div className="skeleton-line body-long" />
          <div className="skeleton-line body-short" />
        </article>
      ))}
    </>
  );
}
