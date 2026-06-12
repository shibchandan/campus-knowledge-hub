import { Link, useNavigate } from "react-router-dom";

export function TermsOfServicePage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030712",
      color: "#f8fafc",
      padding: "2rem",
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: "transparent",
            color: "#94a3b8",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "2rem",
            fontSize: "0.95rem"
          }}
        >
          &larr; Back
        </button>

        <h1 style={{ fontSize: "2.5rem", fontWeight: "700", marginBottom: "1rem", color: "#ffffff" }}>Terms of Service</h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>Last updated: June 2026</p>

        <div style={{
          background: "rgba(30, 41, 59, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "16px",
          padding: "2.5rem",
          lineHeight: "1.6"
        }}>
          <h2 style={{ fontSize: "1.5rem", marginTop: "0", marginBottom: "1rem", color: "#f1f5f9" }}>1. Acceptance of Terms</h2>
          <p style={{ marginBottom: "1.5rem", color: "#cbd5e1" }}>
            By accessing or using Campus Knowledge Hub, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
          </p>

          <h2 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "#f1f5f9" }}>2. User Accounts</h2>
          <p style={{ marginBottom: "1.5rem", color: "#cbd5e1" }}>
            You are responsible for maintaining the security of your account and password. The platform cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.
          </p>

          <h2 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "#f1f5f9" }}>3. Acceptable Use</h2>
          <p style={{ marginBottom: "1.5rem", color: "#cbd5e1" }}>
            You agree not to use the platform for any illegal or unauthorized purpose. You must not violate any laws in your jurisdiction (including but not limited to copyright laws).
            For representatives managing college profiles, you agree to post accurate and verified information regarding branches, cut-offs, and placements.
          </p>

          <h2 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "#f1f5f9" }}>4. Termination</h2>
          <p style={{ marginBottom: "1.5rem", color: "#cbd5e1" }}>
            We reserve the right to suspend or terminate your account at any time, with or without cause, including for any violation of these Terms of Service.
          </p>

          <h2 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "#f1f5f9" }}>5. Disclaimer of Warranties</h2>
          <p style={{ marginBottom: "1.5rem", color: "#cbd5e1" }}>
            The service is provided "as is". We make no warranties, expressed or implied, and hereby disclaim all warranties, including without limitation, implied warranties or conditions of merchantability or fitness for a particular purpose.
          </p>
        </div>
      </div>
    </div>
  );
}
