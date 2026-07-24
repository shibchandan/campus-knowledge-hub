import { useState } from "react";
import { NavLink } from "react-router-dom";
import { apiClient } from "../lib/apiClient";

const prefetchCache = new Set();

export function PrefetchLink({ to, prefetchRoute, children, ...props }) {
  const [prefetched, setPrefetched] = useState(false);

  const handleMouseEnter = () => {
    if (!prefetchRoute || prefetched || prefetchCache.has(prefetchRoute)) return;
    setPrefetched(true);
    prefetchCache.add(prefetchRoute);
    
    // Fire and forget
    apiClient.get(prefetchRoute).catch(() => {
      // Ignore errors silently on prefetch
    });
  };

  return (
    <NavLink to={to} onMouseEnter={handleMouseEnter} {...props}>
      {children}
    </NavLink>
  );
}
