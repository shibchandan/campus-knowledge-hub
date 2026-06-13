import { Link, useNavigate } from "react-router-dom";

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030712", /* matches dark theme */
      color: "#f8fafc",
      padding: "2rem",
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: "transparent",
            color: "var(--color-slate-400-adaptive)",
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

        <h1 style={{ fontSize: "2.5rem", fontWeight: "700", marginBottom: "1rem", color: "#ffffff" }}>Privacy Policy</h1>
        <p style={{ color: "var(--color-slate-400-adaptive)", marginBottom: "2rem" }}>Last updated: June 2026</p>

        <div style={{
          background: "rgba(30, 41, 59, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "16px",
          padding: "2.5rem",
          lineHeight: "1.6"
        }}>
          <h2 style={{ fontSize: "1.5rem", marginTop: "0", marginBottom: "1rem", color: "#f1f5f9" }}>1. Introduction</h2>
          <p style={{ marginBottom: "1.5rem", color: "#cbd5e1" }}>
            Welcome to Campus Knowledge Hub. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our platform.
          </p>

          <h2 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "#f1f5f9" }}>2. Data We Collect</h2>
          <p style={{ marginBottom: "1rem", color: "#cbd5e1" }}>We may collect and process the following data about you:</p>
          <ul style={{ marginBottom: "1.5rem", color: "#cbd5e1", paddingLeft: "1.5rem" }}>
            <li style={{ marginBottom: "0.5rem" }}><strong>Identity Data:</strong> First name, last name, and college affiliation.</li>
            <li style={{ marginBottom: "0.5rem" }}><strong>Contact Data:</strong> Email address.</li>
            <li style={{ marginBottom: "0.5rem" }}><strong>Security Data:</strong> Passwords (securely hashed) and authentication tokens.</li>
            <li style={{ marginBottom: "0.5rem" }}><strong>Usage Data:</strong> Information about how you use our application.</li>
          </ul>

          <h2 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "#f1f5f9" }}>3. How We Use Your Data</h2>
          <ul style={{ marginBottom: "1.5rem", color: "#cbd5e1", paddingLeft: "1.5rem" }}>
            <li style={{ marginBottom: "0.5rem" }}>To authenticate you and provide access to your account.</li>
            <li style={{ marginBottom: "0.5rem" }}>To manage college structures, courses, notices, and quizzes securely.</li>
            <li style={{ marginBottom: "0.5rem" }}>To communicate important updates regarding your account or our services.</li>
          </ul>

          <h2 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "#f1f5f9" }}>4. Third-Party Services</h2>
          <p style={{ marginBottom: "1.5rem", color: "#cbd5e1" }}>
            We do not sell your personal data. We may share necessary data with trusted third-party service providers (such as cloud hosting providers and database services like MongoDB Atlas) strictly for the purpose of operating our platform.
          </p>

          <h2 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "#f1f5f9" }}>5. Your Rights & Data Deletion</h2>
          <p style={{ marginBottom: "1.5rem", color: "#cbd5e1" }}>
            Depending on your location (e.g., under GDPR or the DPDP Act), you have the right to access, correct, or request deletion of your personal data. 
            You can delete your account and all associated personal data directly from the <strong>Account Settings</strong> page inside the application.
          </p>

          <h2 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "#f1f5f9" }}>6. Children's Privacy</h2>
          <p style={{ marginBottom: "1.5rem", color: "#cbd5e1" }}>
            Our platform is designed strictly for college students and adults. We do not knowingly collect personal data from anyone under the age of 13. If we become aware that we have collected personal data from a child under 13 without verification of parental consent, we will take steps to remove that information from our servers immediately.
          </p>

          <h2 style={{ fontSize: "1.5rem", marginTop: "2rem", marginBottom: "1rem", color: "#f1f5f9" }}>7. Contact Us</h2>
          <p style={{ marginBottom: "0", color: "#cbd5e1" }}>
            If you have any questions about this privacy policy, please contact the platform administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
