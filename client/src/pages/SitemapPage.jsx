import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Footer } from "../components/Footer";

export function SitemapPage() {
  const navigate = useNavigate();
  
  const routes = [
    { path: "/", name: "Landing Page" },
    { path: "/login", name: "Sign In / Register" },
    { path: "/dashboard", name: "Dashboard" },
    { path: "/explore", name: "Explore Resources" },
    { path: "/settings", name: "Account Settings" },
    { path: "/admin", name: "Admin Panel" },
    { path: "/privacy", name: "Privacy Policy" },
    { path: "/terms", name: "Terms of Service" },
    { path: "/sitemap", name: "Sitemap" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--color-bg, #030712)", color: "var(--color-text, #f8fafc)", transition: "background 0.3s ease" }}>
      <main style={{ flex: 1, padding: "2rem", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: "transparent", border: "none", color: "var(--color-indigo-400-adaptive, #818cf8)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", padding: 0, marginBottom: "2rem", fontSize: "1rem" }}
        >
          &larr; Back
        </button>
        <div className="card" style={{ padding: "2rem" }}>
          <h1 style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "1.75rem", color: "var(--color-heading, inherit)" }}>Sitemap</h1>
          <p className="muted" style={{ marginBottom: "2rem" }}>
            A complete overview of the Campus Knowledge Hub structure to help you navigate our platform easily.
          </p>
          
          <ul style={{ listStyleType: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
            {routes.map(route => (
              <li key={route.path}>
                <Link 
                  to={route.path} 
                  style={{ 
                    color: "var(--color-indigo-400-adaptive)", 
                    textDecoration: "none", 
                    fontSize: "1.1rem",
                    fontWeight: "500",
                    display: "inline-block",
                    padding: "0.25rem 0"
                  }}
                  onMouseOver={(e) => e.target.style.textDecoration = "underline"}
                  onMouseOut={(e) => e.target.style.textDecoration = "none"}
                >
                  {route.name}
                </Link>
                <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Route: {route.path}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}
