import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiClient } from "../lib/apiClient";

const initialRegisterState = {
  fullName: "",
  email: "",
  password: "",
  role: "student"
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

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [registerForm, setRegisterForm] = useState(initialRegisterState);
  const [forgotForm, setForgotForm] = useState(initialForgotState);
  const [resetForm, setResetForm] = useState(initialResetState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/panel" replace />;
  }

  const redirectTo = location.state?.from?.pathname || "/panel";

  function getAuthErrorMessage(requestError, fallbackMessage) {
    if (requestError?.response?.data?.message) {
      return requestError.response.data.message;
    }

    if (requestError?.request) {
      return "Cannot reach backend server. Make sure API is running on http://localhost:5000.";
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
      await login(loginForm);
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "Login failed. Check your email and password."));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await register(registerForm);
      navigate("/panel", { replace: true });
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

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-hero">
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

        {mode === "login" ? (
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
              <input
                type="password"
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
              <input
                type="password"
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

            <button className="auth-submit" disabled={loading} type="submit">
              {loading ? "Creating account..." : "Register"}
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
              <input
                minLength={6}
                onChange={(event) =>
                  setResetForm((current) => ({ ...current, newPassword: event.target.value }))
                }
                placeholder="Enter new password"
                required
                type="password"
                value={resetForm.newPassword}
              />
            </label>

            <label className="auth-field">
              <span>Confirm Password</span>
              <input
                minLength={6}
                onChange={(event) =>
                  setResetForm((current) => ({ ...current, confirmPassword: event.target.value }))
                }
                placeholder="Confirm new password"
                required
                type="password"
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
    </div>
  );
}
