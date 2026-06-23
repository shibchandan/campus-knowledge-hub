export function HighlightText({ text, highlight }) {
  if (!highlight || !highlight.trim() || !text) return <>{text}</>;
  
  const parts = text.toString().split(new RegExp(`(${highlight})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <strong key={i} style={{ color: "var(--color-primary)", fontWeight: "600", background: "rgba(167, 139, 250, 0.15)", padding: "0 2px", borderRadius: "2px" }}>
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}
