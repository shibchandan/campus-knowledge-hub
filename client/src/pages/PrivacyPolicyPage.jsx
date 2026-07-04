import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("intro");

  const sections = [
    { id: "intro", title: "Introduction", icon: "👋" },
    { id: "data", title: "Data We Collect", icon: "📊" },
    { id: "usage", title: "How We Use Data", icon: "⚙️" },
    { id: "thirdparty", title: "Third-Party Services", icon: "🤝" },
    { id: "rights", title: "Your Rights", icon: "⚖️" },
    { id: "children", title: "Children's Privacy", icon: "🧒" },
    { id: "contact", title: "Contact Us", icon: "✉️" }
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
        background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)",
        borderBottom: "1px solid var(--glass-border)",
        padding: "4rem 2rem 3rem",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Glow effect */}
        <div style={{
          position: "absolute", top: "-50%", left: "20%", width: "60%", height: "200%",
          background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
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
            background: "linear-gradient(to right, #60a5fa, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Privacy Policy
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
          '@media (max-width: 768px)': { display: "none" } // Note: Inline styles don't support media queries perfectly, but we'll use a responsive trick later if needed. For now, flex-wrap will handle it if we let it.
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
                color: activeSection === section.id ? "#60a5fa" : "var(--color-slate-400-adaptive)",
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
              onMouseOver={e => e.currentTarget.style.color = "#60a5fa"}
              onMouseOut={e => e.currentTarget.style.color = activeSection === section.id ? "#60a5fa" : "var(--color-slate-400-adaptive)"}
            >
              {activeSection === section.id && (
                <div style={{ position: "absolute", left: 0, top: "10%", bottom: "10%", width: "3px", background: "#60a5fa", borderRadius: "0 4px 4px 0" }} />
              )}
              <span>{section.icon}</span>
              {section.title}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, lineHeight: "1.8", fontSize: "1.05rem" }}>
          
          <div id="intro" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(59,130,246,0.1)", borderRadius: "12px", color: "#60a5fa" }}>👋</span>
              1. Introduction
            </h2>
            <p style={{ color: "var(--glass-text-secondary)", marginBottom: "1.5rem" }}>
              Welcome to <strong>Campus Knowledge Hub</strong>. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our platform.
            </p>
          </div>

          <div id="data" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(167,139,250,0.1)", borderRadius: "12px", color: "#a78bfa" }}>📊</span>
              2. Data We Collect
            </h2>
            <p style={{ color: "var(--glass-text-secondary)", marginBottom: "1.5rem" }}>We may collect and process the following data about you:</p>
            
            <div style={{ display: "grid", gap: "1rem" }}>
              {[
                { title: "Identity Data", desc: "First name, last name, and college affiliation.", color: "#ef4444" },
                { title: "Contact Data", desc: "Email address.", color: "#f59e0b" },
                { title: "Security Data", desc: "Passwords (securely hashed) and authentication tokens.", color: "#10b981" },
                { title: "Usage Data", desc: "Information about how you use our application.", color: "#3b82f6" }
              ].map((item, i) => (
                <div key={i} style={{ 
                  background: "var(--glass-bg)", 
                  border: "1px solid var(--glass-border)", 
                  padding: "1.5rem", 
                  borderRadius: "12px",
                  display: "flex",
                  gap: "1rem"
                }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: item.color, marginTop: "0.4rem", boxShadow: `0 0 10px ${item.color}` }} />
                  <div>
                    <strong style={{ display: "block", color: "var(--glass-text-primary)", marginBottom: "0.25rem" }}>{item.title}</strong>
                    <span style={{ color: "#94a3b8" }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="usage" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(236,72,153,0.1)", borderRadius: "12px", color: "#ec4899" }}>⚙️</span>
              3. How We Use Your Data
            </h2>
            <ul style={{ color: "var(--glass-text-secondary)", paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <li>To authenticate you and provide access to your account.</li>
              <li>To manage college structures, courses, notices, and quizzes securely.</li>
              <li>To communicate important updates regarding your account or our services.</li>
            </ul>
          </div>

          <div id="thirdparty" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(245,158,11,0.1)", borderRadius: "12px", color: "#f59e0b" }}>🤝</span>
              4. Third-Party Services
            </h2>
            <p style={{ color: "var(--glass-text-secondary)", background: "rgba(245,158,11,0.05)", borderLeft: "4px solid #f59e0b", padding: "1.5rem", borderRadius: "0 12px 12px 0" }}>
              We <strong>do not</strong> sell your personal data. We may share necessary data with trusted third-party service providers (such as cloud hosting providers and database services like MongoDB Atlas) strictly for the purpose of operating our platform.
            </p>
          </div>

          <div id="rights" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(16,185,129,0.1)", borderRadius: "12px", color: "#10b981" }}>⚖️</span>
              5. Your Rights & Data Deletion
            </h2>
            <p style={{ color: "var(--glass-text-secondary)", marginBottom: "1.5rem" }}>
              Depending on your location (e.g., under GDPR or the DPDP Act), you have the right to access, correct, or request deletion of your personal data. 
            </p>
            <p style={{ color: "var(--glass-text-secondary)" }}>
              You can delete your account and all associated personal data directly from the <Link to="/account" style={{ color: "#60a5fa", textDecoration: "none" }}>Account Settings</Link> page inside the application.
            </p>
          </div>

          <div id="children" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(14,165,233,0.1)", borderRadius: "12px", color: "#0ea5e9" }}>🧒</span>
              6. Children's Privacy
            </h2>
            <p style={{ color: "var(--glass-text-secondary)" }}>
              Our platform is designed strictly for college students and adults. We do not knowingly collect personal data from anyone under the age of 13. If we become aware that we have collected personal data from a child under 13 without verification of parental consent, we will take steps to remove that information from our servers immediately.
            </p>
          </div>

          <div id="contact" className="policy-section" style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "2rem", color: "var(--glass-text-primary)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ padding: "0.5rem", background: "rgba(99,102,241,0.1)", borderRadius: "12px", color: "#6366f1" }}>✉️</span>
              7. Contact Us
            </h2>
            <p style={{ color: "var(--glass-text-secondary)" }}>
              If you have any questions about this privacy policy, please contact the platform administrator at <strong>shibchandan11@gmail.com</strong>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
