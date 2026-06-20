import { useState, useEffect } from "react";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { useAuth } from "../auth/AuthContext";
import { apiClient } from "../lib/apiClient";

const initialRegisterState = {
  fullName: "",
  email: "",
  password: "",
  role: "student",
  collegeName: "",
  collegeStudentId: "",
  officialCollegeEmail: "",
  studentProof: null
};

const initialLoginState = {
  email: "",
  password: ""
};

const initialForgotState = {
  email: ""
};

const initialResetState = {
  email: "",
  otp: "",
  newPassword: "",
  confirmPassword: ""
};

function PasswordInput({ value, onChange, placeholder, required, minLength }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible(!visible)}
        tabIndex="-1"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, verify2fa, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [registerForm, setRegisterForm] = useState(initialRegisterState);
  const [forgotForm, setForgotForm] = useState(initialForgotState);
  const [resetForm, setResetForm] = useState(initialResetState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isNewCollege, setIsNewCollege] = useState(false);
  const [availableColleges, setAvailableColleges] = useState([]);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationOtp, setVerificationOtp] = useState("");
  const [verificationCooldown, setVerificationCooldown] = useState(0);

  useEffect(() => {
    async function loadColleges() {
      try {
        const response = await apiClient.get("/governance/public-colleges");
        const colleges = response.data.data || [];
        setAvailableColleges(colleges);
      } catch (err) {
        console.error("Failed to load approved colleges for autocomplete", err);
      }
    }
    loadColleges();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("expired") === "true") {
      setError("Your session has expired. Please log in again.");
    }
  }, [location.search]);

  useEffect(() => {
    let timer;
    if (verificationCooldown > 0) {
      timer = setInterval(() => setVerificationCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [verificationCooldown]);

  if (isAuthenticated) {
    return <Navigate to="/colleges" replace />;
  }

  const redirectTo = location.state?.from?.pathname || "/colleges";

  function getAuthErrorMessage(requestError, fallbackMessage) {
    if (requestError?.response?.data?.message) {
      return requestError.response.data.message;
    }

    if (requestError?.request) {
      const targetUrl = apiClient.defaults.baseURL || "http://localhost:5000/api";
      return `Cannot reach backend server. Make sure API is running on ${targetUrl}.`;
    }

    return requestError?.message || fallbackMessage;
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await login(loginForm);
      if (result && result.twoFactorRequired) {
        setTwoFactorRequired(true);
        setTwoFactorUserId(result.userId);
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (requestError) {
      if (requestError.response?.data?.requiresVerification) {
        setVerificationEmail(loginForm.email);
        setMode("verifyEmail");
        setError("Please verify your email before logging in.");
      } else {
        setError(getAuthErrorMessage(requestError, "Login failed. Check your email and password."));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTwoFactorSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await verify2fa(twoFactorUserId, twoFactorCode);
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "Invalid 2FA verification code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!agreedToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      setLoading(false);
      return;
    }

    if (registerForm.role === "student" && isNewCollege) {
      setError("Students cannot register a new college. A College Representative must add it first.");
      setLoading(false);
      return;
    }

    try {
      const result = await register(registerForm);
      if (result && result.requiresVerification) {
        setVerificationEmail(result.email);
        setMode("verifyEmail");
        setSuccess(result.message);
        return;
      }
      
      if (result?.user?.representativeRequestStatus === "pending") {
        setSuccess(
          "Representative request sent to admin. You can log in and use student access until approval."
        );
      }
      navigate("/colleges", { replace: true });
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "Registration failed. Try a different email."));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPasswordSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient.post("/auth/forgot-password", forgotForm);
      setSuccess(response.data.message);
      setResetForm((current) => ({ ...current, email: forgotForm.email }));
      setMode("reset");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "Failed to send OTP."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPasswordSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError("New password and confirm password must match.");
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post("/auth/reset-password", {
        email: resetForm.email,
        otp: resetForm.otp,
        newPassword: resetForm.newPassword
      });
      setSuccess(response.data.message);
      setResetForm(initialResetState);
      setLoginForm((current) => ({ ...current, email: forgotForm.email, password: "" }));
      setMode("login");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "Failed to reset password."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyRegistrationSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { verifyRegistrationOtp } = await import("../auth/AuthContext"); // useAuth already has it but we destructured it above. Wait, let's just destructure verifyRegistrationOtp from useAuth.
      // Wait, I can't import inside function like this if not needed, let's use apiClient instead if verifyRegistrationOtp is missing from destructuring at the top.
      const response = await apiClient.post("/auth/verify-registration-otp", {
        email: verificationEmail,
        otp: verificationOtp
      });
      // Force reload or redirect after saving token
      localStorage.removeItem("campus-knowledge-hub-college");
      window.location.href = redirectTo; // quick reload to set session context
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "Invalid verification code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendRegistrationOtp() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient.post("/auth/resend-registration-otp", {
        email: verificationEmail
      });
      setSuccess(response.data.message);
      setVerificationCooldown(60);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "Failed to resend verification code."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-hero">
          <div className="auth-logo-box">
            <img src="/logo.png" alt="Campus Knowledge Hub" className="auth-main-logo" />
          </div>
          <p className="eyebrow">Campus Knowledge Hub</p>
          <h1>Login To Your Academic Dashboard</h1>
          <p className="muted">
            Sign in with your email and password to access departments, semesters, subjects, and study resources.
          </p>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => switchMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === "register" ? "auth-tab active" : "auth-tab"}
            onClick={() => switchMode("register")}
            type="button"
          >
            Register
          </button>
          <button
            className={mode === "forgot" || mode === "reset" ? "auth-tab active" : "auth-tab"}
            onClick={() => switchMode("forgot")}
            type="button"
          >
            Forgot Password
          </button>
        </div>

        {error ? <p className="auth-error">{error}</p> : null}
        {success ? <p className="success-note">{success}</p> : null}

        {twoFactorRequired ? (
          <form className="auth-form" onSubmit={handleTwoFactorSubmit}>
            <div className="auth-hero" style={{ padding: 0, marginBottom: "1.5rem" }}>
              <h2>Two-Factor Verification</h2>
              <p className="muted">
                Your account is protected with Two-Factor Authentication. Enter the 6-digit code from your authenticator app.
              </p>
            </div>
            <label className="auth-field">
              <span>Authenticator Code</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value)}
                placeholder="6-digit code"
                required
                autoFocus
              />
            </label>
            <button className="auth-submit" disabled={loading} type="submit">
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              className="auth-link-button"
              onClick={() => {
                setTwoFactorRequired(false);
                setTwoFactorUserId("");
                setTwoFactorCode("");
                setError("");
              }}
              type="button"
            >
              Back to login
            </button>
          </form>
        ) : mode === "verifyEmail" ? (
          <form className="auth-form" onSubmit={handleVerifyRegistrationSubmit}>
            <div className="auth-hero" style={{ padding: 0, marginBottom: "1.5rem" }}>
              <h2>Verify Your Email</h2>
              <p className="muted">
                We've sent a 6-digit verification code to <strong>{verificationEmail}</strong>.
              </p>
            </div>
            <label className="auth-field">
              <span>Verification Code</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                value={verificationOtp}
                onChange={(event) => setVerificationOtp(event.target.value)}
                placeholder="6-digit code"
                required
                autoFocus
              />
            </label>
            <button className="auth-submit" disabled={loading} type="submit">
              {loading ? "Verifying..." : "Verify Account"}
            </button>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="auth-button secondary"
                onClick={handleResendRegistrationOtp}
                disabled={loading || verificationCooldown > 0}
                type="button"
                style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--color-text)', border: '1px solid var(--glass-border)' }}
              >
                {verificationCooldown > 0 ? `Resend in ${verificationCooldown}s` : "Resend Code"}
              </button>
            </div>
            <button
              className="auth-link-button"
              onClick={() => switchMode("login")}
              type="button"
            >
              Back to login
            </button>
          </form>
        ) : mode === "login" ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="student@college.edu"
                required
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <PasswordInput
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Enter password"
                required
              />
            </label>

            <button className="auth-submit" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Login"}
            </button>

            <button className="auth-link-button" onClick={() => switchMode("forgot")} type="button">
              Forgot your password?
            </button>
          </form>
        ) : null}

        {mode === "register" ? (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <label className="auth-field">
              <span>Full Name</span>
              <input
                type="text"
                value={registerForm.fullName}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, fullName: event.target.value }))
                }
                placeholder="Enter your name"
                required
              />
            </label>

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="student@college.edu"
                required
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <PasswordInput
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Create password"
                minLength={6}
                required
              />
            </label>

            <label className="auth-field">
              <span>Role</span>
              <select
                value={registerForm.role}
                onChange={(event) =>
                  setRegisterForm((current) => ({ ...current, role: event.target.value }))
                }
              >
                <option value="student">Student</option>
                <option value="representative">College Representative</option>
              </select>
            </label>
            {registerForm.role === "student" || registerForm.role === "representative" ? (
              <>
                <label className="auth-field">
                  <span>College Name</span>
                  <select
                    value={isNewCollege ? "other" : (availableColleges.some(c => c.name === registerForm.collegeName) ? registerForm.collegeName : (registerForm.collegeName ? "other" : ""))}
                    onChange={(event) => {
                      if (event.target.value === "other") {
                        setIsNewCollege(true);
                        setRegisterForm((current) => ({ ...current, collegeName: "" }));
                      } else {
                        setIsNewCollege(false);
                        setRegisterForm((current) => ({ ...current, collegeName: event.target.value }));
                      }
                    }}
                    required={!isNewCollege}
                  >
                    <option value="" disabled>Select your college</option>
                    {availableColleges.map((college) => (
                      <option key={college.name} value={college.name}>
                        {college.name}
                      </option>
                    ))}
                    <option value="other">My college is not listed here (Needs a Representative)</option>
                  </select>

                  {registerForm.role === "representative" && !isNewCollege && availableColleges.find(c => c.name === registerForm.collegeName)?.hasRepresentative && (
                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#ef4444' }}>
                        <strong>Data Security: Representative Already Exists</strong><br/>
                        This college already has an approved representative. A college can have only one representative for data security. You can only register as a student for this college.
                      </p>
                    </div>
                  )}
                  
                  {isNewCollege && registerForm.role === "representative" && (
                    <input
                      type="text"
                      value={registerForm.collegeName}
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, collegeName: event.target.value }))
                      }
                      placeholder="Type your college name..."
                      required
                      style={{ marginTop: '8px' }}
                    />
                  )}

                  {isNewCollege && registerForm.role === "student" && (
                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(242, 166, 90, 0.1)', border: '1px solid rgba(242, 166, 90, 0.3)', borderRadius: '8px' }}>
                      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                        <strong>Your college is not listed here.</strong><br/>
                        A College Representative needs to register and add your college to the platform first. Once approved, it will automatically appear in this list!
                      </p>
                    </div>
                  )}
                </label>
                <label className="auth-field">
                  <span>Official College Email (optional)</span>
                  <input
                    type="email"
                    value={registerForm.officialCollegeEmail}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        officialCollegeEmail: event.target.value
                      }))
                    }
                    placeholder="yourid@college.edu"
                  />
                </label>
              </>
            ) : null}
            {registerForm.role === "student" ? (
              <>
                <label className="auth-field">
                  <span>College ID</span>
                  <input
                    type="text"
                    value={registerForm.collegeStudentId}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        collegeStudentId: event.target.value.toUpperCase()
                      }))
                    }
                    placeholder="Enter your student/college ID"
                    required
                  />
                </label>
                <label className="auth-field">
                  <span>Proof Document</span>
                  <input
                    accept="application/pdf,image/*"
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        studentProof: event.target.files?.[0] || null
                      }))
                    }
                    required
                    type="file"
                  />
                </label>
                <p className="muted">
                  Upload your ID card or proof document. If you also add an official college email, the platform will send an OTP there for extra verification.
                </p>
              </>
            ) : null}
            {registerForm.role === "representative" ? (
              <p className="muted">
                Representative access requires admin approval. Until approved, your account will use student access.
              </p>
            ) : null}

            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", margin: "1rem 0", color: "var(--color-slate-400-adaptive)", fontSize: "0.875rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                style={{ marginTop: "0.2rem", accentColor: "#3b82f6" }}
              />
              <span>
                I agree to the <Link to="/terms" style={{ color: "#3b82f6", textDecoration: "none" }}>Terms of Service</Link> and <Link to="/privacy" style={{ color: "#3b82f6", textDecoration: "none" }}>Privacy Policy</Link>.
              </span>
            </label>

            <button
              type="submit"
              className="auth-button"
              disabled={
                loading || 
                (registerForm.role === "student" && isNewCollege) ||
                (registerForm.role === "representative" && !isNewCollege && availableColleges.find(c => c.name === registerForm.collegeName)?.hasRepresentative)
              }
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
        ) : null}

        {mode === "forgot" ? (
          <form className="auth-form" onSubmit={handleForgotPasswordSubmit}>
            <label className="auth-field">
              <span>Registered Email</span>
              <input
                type="email"
                value={forgotForm.email}
                onChange={(event) =>
                  setForgotForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="student@college.edu"
                required
              />
            </label>

            <button className="auth-submit" disabled={loading} type="submit">
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>

            <button className="auth-link-button" onClick={() => switchMode("login")} type="button">
              Back to login
            </button>
          </form>
        ) : null}

        {mode === "reset" ? (
          <form className="auth-form" onSubmit={handleResetPasswordSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={resetForm.email}
                onChange={(event) =>
                  setResetForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="student@college.edu"
                required
              />
            </label>

            <label className="auth-field">
              <span>OTP</span>
              <input
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                onChange={(event) =>
                  setResetForm((current) => ({ ...current, otp: event.target.value }))
                }
                placeholder="6-digit code"
                required
                type="text"
                value={resetForm.otp}
              />
            </label>

            <label className="auth-field">
              <span>New Password</span>
              <PasswordInput
                minLength={6}
                onChange={(event) =>
                  setResetForm((current) => ({ ...current, newPassword: event.target.value }))
                }
                placeholder="Enter new password"
                required
                value={resetForm.newPassword}
              />
            </label>

            <label className="auth-field">
              <span>Confirm Password</span>
              <PasswordInput
                minLength={6}
                onChange={(event) =>
                  setResetForm((current) => ({ ...current, confirmPassword: event.target.value }))
                }
                placeholder="Confirm new password"
                required
                value={resetForm.confirmPassword}
              />
            </label>

            <button className="auth-submit" disabled={loading} type="submit">
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button className="auth-link-button" onClick={() => switchMode("forgot")} type="button">
              Request a new OTP
            </button>
          </form>
        ) : null}
      </div>
      
      <div style={{ marginTop: "2rem", width: "100%", maxWidth: "800px" }}>
        <Footer />
      </div>
    </div>
  );
}
