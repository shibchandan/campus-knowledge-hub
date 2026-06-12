import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      marginTop: "auto",
      padding: "2rem 1rem",
      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
      background: "transparent",
      color: "#64748b",
      fontSize: "0.875rem",
      textAlign: "center"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <Link to="/privacy" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={(e) => e.target.style.color = "#f1f5f9"} onMouseOut={(e) => e.target.style.color = "#94a3b8"}>
            Privacy Policy
          </Link>
          <Link to="/terms" style={{ color: "#94a3b8", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={(e) => e.target.style.color = "#f1f5f9"} onMouseOut={(e) => e.target.style.color = "#94a3b8"}>
            Terms of Service
          </Link>
        </div>
        <div>
          &copy; {currentYear} Campus Knowledge Hub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
