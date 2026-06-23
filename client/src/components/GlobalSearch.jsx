import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCollege } from "../college/CollegeContext";
import { useDebounce } from "../hooks/useDebounce";

const navLinks = [
  { label: "Dashboard Overview", to: "/dashboard", type: "Navigation" },
  { label: "Lectures", to: "/lectures", type: "Navigation" },
  { label: "Notes & PYQs", to: "/notes", type: "Navigation" },
  { label: "Quizzes", to: "/quizzes", type: "Navigation" },
  { label: "Live Assignments", to: "/assignments", type: "Navigation" },
  { label: "AI Studio", to: "/ai-studio", type: "Navigation" },
  { label: "Integrity Shield", to: "/integrity", type: "Navigation" },
  { label: "Marketplace", to: "/marketplace", type: "Navigation" },
  { label: "Community Forum", to: "/community", type: "Navigation" },
  { label: "Account Settings", to: "/account", type: "Navigation" },
  { label: "Representative Panel", to: "/panel/representative", type: "Navigation" },
  { label: "Student Panel", to: "/panel/student", type: "Navigation" },
];

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const stored = localStorage.getItem("ckh_recent_searches");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const { visibleColleges, selectCollegeById } = useCollege();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener("open-global-search", handleOpenEvent);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-global-search", handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    
    const term = debouncedQuery.toLowerCase().trim();
    const matches = [];

    // Search Navigation
    navLinks.forEach((nav) => {
      if (nav.label.toLowerCase().includes(term)) {
        matches.push({ ...nav, id: nav.to });
      }
    });

    // Search Colleges
    visibleColleges.forEach((col) => {
      if (col.name.toLowerCase().includes(term) || col.location.toLowerCase().includes(term)) {
        matches.push({
          label: col.name,
          subLabel: col.location,
          type: "College",
          id: col.id,
          action: () => {
            selectCollegeById(col.id);
            navigate("/dashboard");
          }
        });
      }
    });

    return matches.slice(0, 8); // Max 8 results
  }, [debouncedQuery, visibleColleges, selectCollegeById, navigate]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (item) => {
    if (!item) return;
    
    // Save to recent
    const newRecents = [item, ...recentSearches.filter(r => r.id !== item.id)].slice(0, 5);
    setRecentSearches(newRecents);
    localStorage.setItem("ckh_recent_searches", JSON.stringify(newRecents));

    if (item.type === "Navigation" && item.to) {
      navigate(item.to);
    } else if (item.action) {
      item.action();
    } else if (item.type === "Recent" && item.to) {
       navigate(item.to);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    const items = debouncedQuery ? results : recentSearches.map(r => ({ ...r, type: "Recent" }));
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(items[selectedIndex]);
    }
  };

  const highlightText = (text, highlight) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
        <strong key={i} style={{ color: "var(--color-primary)", fontWeight: "600" }}>{part}</strong> : part
    );
  };

  if (!isOpen) return null;

  const isPending = query !== debouncedQuery;
  const displayItems = debouncedQuery ? results : recentSearches.map(r => ({ ...r, type: "Recent" }));

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)",
      zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "10vh"
    }} onClick={() => setIsOpen(false)}>
      <div 
        style={{
          width: "100%", maxWidth: "600px", background: "rgba(30, 41, 59, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", overflow: "hidden",
          display: "flex", flexDirection: "column", margin: "0 1rem"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "12px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-slate-400-adaptive)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search colleges, tools, or navigation..."
            style={{
              flex: 1, background: "transparent", border: "none", color: "white",
              fontSize: "1.125rem", outline: "none"
            }}
          />
          {isPending && (
            <div className="search-spinner" style={{
              width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.1)",
              borderTopColor: "var(--color-primary)", borderRadius: "50%", animation: "spin 1s linear infinite"
            }} />
          )}
          <kbd style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.1)", padding: "4px 6px", borderRadius: "4px", color: "var(--color-slate-400-adaptive)" }}>ESC</kbd>
        </div>

        <div style={{ maxHeight: "400px", overflowY: "auto", padding: "8px 0" }}>
          {!debouncedQuery && recentSearches.length > 0 && (
            <div style={{ padding: "8px 16px", fontSize: "0.75rem", fontWeight: "600", color: "var(--color-slate-400-adaptive)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Recent Searches
            </div>
          )}
          
          {displayItems.length > 0 ? (
            displayItems.map((item, idx) => (
              <div
                key={`${item.type}-${item.id}`}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => handleSelect(item)}
                style={{
                  padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: selectedIndex === idx ? "rgba(255, 255, 255, 0.05)" : "transparent",
                  borderLeft: selectedIndex === idx ? "3px solid var(--color-primary)" : "3px solid transparent",
                }}
              >
                <div>
                  <div style={{ color: "white", fontSize: "0.9375rem", fontWeight: "500" }}>
                    {highlightText(item.label, debouncedQuery)}
                  </div>
                  {item.subLabel && <div style={{ color: "var(--color-slate-400-adaptive)", fontSize: "0.8125rem", marginTop: "2px" }}>{highlightText(item.subLabel, debouncedQuery)}</div>}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-slate-400-adaptive)", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "12px" }}>
                  {item.type}
                </div>
              </div>
            ))
          ) : debouncedQuery && !isPending ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--color-slate-400-adaptive)" }}>
              <p style={{ marginBottom: "8px", color: "white" }}>No results found for "{debouncedQuery}"</p>
              <p style={{ fontSize: "0.875rem" }}>Try searching for "Colleges", "AI", or "Assignments".</p>
            </div>
          ) : !debouncedQuery && recentSearches.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--color-slate-400-adaptive)" }}>
              <p style={{ fontSize: "0.875rem" }}>Start typing to search across the Campus Hub.</p>
            </div>
          ) : null}
        </div>
        
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)", display: "flex", gap: "16px", fontSize: "0.75rem", color: "var(--color-slate-400-adaptive)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><kbd style={{ background: "rgba(255,255,255,0.1)", padding: "2px 4px", borderRadius: "4px" }}>↑</kbd><kbd style={{ background: "rgba(255,255,255,0.1)", padding: "2px 4px", borderRadius: "4px" }}>↓</kbd> to navigate</span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><kbd style={{ background: "rgba(255,255,255,0.1)", padding: "2px 4px", borderRadius: "4px" }}>Enter</kbd> to select</span>
        </div>
      </div>
    </div>
  );
}
