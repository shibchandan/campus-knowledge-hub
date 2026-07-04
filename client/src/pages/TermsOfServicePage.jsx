import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export function TermsOfServicePage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("acceptance");

  const sections = [
    { id: "acceptance", title: "1. Acceptance", icon: "🤝" },
    { id: "accounts", title: "2. User Accounts", icon: "👤" },
    { id: "acceptable", title: "3. Acceptable Use", icon: "✅" },
    { id: "termination", title: "4. Termination", icon: "🚫" },
    { id: "disclaimer", title: "5. Disclaimer", icon: "⚠️" }
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= scrollPosition && (element.offsetTop + element.offsetHeight) > scrollPosition) {
          setActiveSection(section.id);
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveSection(id);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-bg-primary)",
      color: "var(--color-text-primary)",
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      {/* Hero Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(245,158,11,0.1) 100%)",
        borderBottom: "1px solid var(--glass-border)",
        padding: "4rem 2rem 3rem",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Glow effect */}
        <div style={{
          position: "absolute", top: "-50%", left: "20%", width: "60%", height: "200%",
          background: "radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)",
          filter: "blur(60px)", pointerEvents: "none"
        }} />
        
        <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <button 
            onClick={() => navigate(-1)}
            style={{
              background: "var(--glass-bg)",
              backdropFilter: "blur(10px)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--glass-border)",
              borderRadius: "20px",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "2rem",
              fontSize: "0.9rem",
              transition: "all 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "var(--glass-bg-hover)"}
            onMouseOut={e => e.currentTarget.style.background = "var(--glass-bg)"}
          >
            &larr; Back to Platform
          </button>
          
          <h1 style={{ 
            fontSize: "clamp(2.5rem, 5vw, 4rem)", 
            fontWeight: "800", 
            margin: "0 0 1rem 0",
            background: "linear-gradient(to right, #ec4899, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Terms of Service
          </h1>
          <p style={{ color: "var(--color-slate-400-adaptive)", fontSize: "1.1rem", margin: 0 }}>
            Last updated: June 2026
          </p>
        </div>
      </div>

      <div style={{ 
        maxWidth: "1000px", 
        margin: "0 auto", 
        padding: "3rem 2rem",
        display: "flex",
        gap: "4rem",
        position: "relative"
      }}>
        {/* Sidebar Navigation */}
        <div style={{
          width: "250px",
          flexShrink: 0,
          position: "sticky",
          top: "100px",
          alignSelf: "flex-start",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }} className="hide-on-mobile">
          <style>{`
            @media (max-width: 768px) { .hide-on-mobile { display: none !important; } }
            .policy-section { scroll-margin-top: 100px; }
          `}</style>
          
          <h3 style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--color-slate-400-adaptive)", margin: "0 0 1rem 0" }}>
            Contents
          </h3>
          
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              style={{
                textAlign: "left",
                background: "transparent",
                border: "none",
                color: activeSection === section.id ? "#ec4899" : "var(--color-slate-400-adaptive)",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.95rem",
                fontWeight: activeSection === section.id ? "600" : "400",
                position: "relative",
                transition: "all 0.2s"
              }}
              onMouseOver={e => e.currentTarget.style.color = "#ec4899"}
              onMouseOut={e => e.currentTarget.style.color = activeSection === section.id ? "#ec4899" : "var(--color-slate-400-adaptive)"}
            >
              {activeSection === section.id && (
                <div style={{ position: "absolute", left: 0, top: "10%", bottom: "10%", width: "3px", background: "#ec4899", borderRadius: "0 4px 4px 0" }} />
              )}
              <span>{section.icon}</span>
              {section.title}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, lineHeight: "1.8", fontSize: "1.05rem" }}>
          
          <div id="acceptance" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(59,130,246,0.1)", borderRadius: "12px", color: "#60a5fa" }}>🤝</span>
              1. Acceptance of Terms
            </h2>
            <p style={{ color: "var(--glass-text-secondary)", marginBottom: "1.5rem", background: "var(--glass-bg)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
              By accessing or using Campus Knowledge Hub, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
            </p>
          </div>

          <div id="accounts" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(167,139,250,0.1)", borderRadius: "12px", color: "#a78bfa" }}>👤</span>
              2. User Accounts
            </h2>
            <p style={{ color: "var(--glass-text-secondary)", marginBottom: "1.5rem" }}>
              You are responsible for maintaining the security of your account and password. The platform cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.
            </p>
          </div>

          <div id="acceptable" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(16,185,129,0.1)", borderRadius: "12px", color: "#10b981" }}>✅</span>
              3. Acceptable Use
            </h2>
            <p style={{ color: "var(--glass-text-secondary)", marginBottom: "1.5rem" }}>
              You agree not to use the platform for any illegal or unauthorized purpose. You must not violate any laws in your jurisdiction (including but not limited to copyright laws).
            </p>
            <p style={{ color: "var(--glass-text-secondary)", background: "rgba(16,185,129,0.05)", borderLeft: "4px solid #10b981", padding: "1.5rem", borderRadius: "0 12px 12px 0" }}>
              For representatives managing college profiles, you agree to post accurate and verified information regarding branches, cut-offs, and placements.
            </p>
          </div>

          <div id="termination" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(239,68,68,0.1)", borderRadius: "12px", color: "#ef4444" }}>🚫</span>
              4. Termination
            </h2>
            <p style={{ color: "var(--glass-text-secondary)", marginBottom: "1.5rem" }}>
              We reserve the right to suspend or terminate your account at any time, with or without cause, including for any violation of these Terms of Service.
            </p>
          </div>

          <div id="disclaimer" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(245,158,11,0.1)", borderRadius: "12px", color: "#f59e0b" }}>⚠️</span>
              5. Disclaimer of Warranties
            </h2>
            <p style={{ color: "var(--glass-text-secondary)", marginBottom: "1.5rem" }}>
              The service is provided "as is". We make no warranties, expressed or implied, and hereby disclaim all warranties, including without limitation, implied warranties or conditions of merchantability or fitness for a particular purpose.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
