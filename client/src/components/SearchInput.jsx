import { useRef, useEffect } from "react";

export function SearchInput({ 
  value, 
  onChange, 
  onClear, 
  isPending = false, 
  placeholder = "Search...", 
  className = "",
  autoFocus = false
}) {
  const inputRef = useRef(null);

  // Keyboard shortcut: Press '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't focus if we're already typing in another input/textarea
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={`search-input-wrapper ${className}`} style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
      <svg
        style={{ position: "absolute", left: "12px", color: "var(--color-slate-400-adaptive)", pointerEvents: "none" }}
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: "100%",
          padding: "8px 40px 8px 36px", // Space for icon and clear button
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          background: "rgba(255, 255, 255, 0.05)",
          color: "inherit",
          fontSize: "0.875rem",
          outline: "none"
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--color-primary)";
          e.target.style.background = "rgba(255, 255, 255, 0.08)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
          e.target.style.background = "rgba(255, 255, 255, 0.05)";
        }}
      />
      
      <div style={{ position: "absolute", right: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
        {isPending ? (
          <div className="search-spinner" style={{
            width: "14px", height: "14px", 
            border: "2px solid rgba(255,255,255,0.1)", 
            borderTopColor: "var(--color-primary)", 
            borderRadius: "50%", 
            animation: "spin 1s linear infinite"
          }} />
        ) : null}
        
        {value && !isPending && onClear ? (
          <button
            type="button"
            onClick={() => {
              onClear();
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            style={{
              background: "none", border: "none", padding: 0,
              color: "var(--color-slate-400-adaptive)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        ) : null}
        
        {!value && !isPending ? (
          <kbd style={{
            fontSize: "0.7rem", padding: "2px 6px",
            background: "rgba(255,255,255,0.1)", borderRadius: "4px",
            color: "var(--color-slate-400-adaptive)",
            border: "1px solid rgba(255,255,255,0.05)"
          }}>/</kbd>
        ) : null}
      </div>
    </div>
  );
}
