import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { apiClient, setAuthToken } from "../lib/apiClient";

const AUTH_STORAGE_KEY = "campus-knowledge-hub-auth";
const COLLEGE_STORAGE_KEY = "campus-knowledge-hub-college";

const AuthStateContext = createContext(null);
const AuthDispatchContext = createContext(null);

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadStoredSession());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    if (session?.token) {
      setAuthToken(session.token);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      return;
    }

    setAuthToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, [session]);

  useEffect(() => {
    async function bootstrapSession() {
      if (!session?.token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        setAuthToken(session.token);
        const response = await apiClient.get("/auth/me");
        setSession((current) => ({
          token: current.token,
          user: response.data.data
        }));
      } catch {
        setSession(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrapSession();
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await apiClient.post("/auth/login", credentials);
    if (response.data.twoFactorRequired) {
      return response.data;
    }
    localStorage.removeItem(COLLEGE_STORAGE_KEY);
    setSession(response.data.data);
    return response.data.data;
  }, []);

  const verify2fa = useCallback(async (userId, code) => {
    const response = await apiClient.post("/auth/2fa/login-verify", { userId, code });
    localStorage.removeItem(COLLEGE_STORAGE_KEY);
    setSession(response.data.data);
    return response.data.data;
  }, []);

  const register = useCallback(async (payload) => {
    const shouldUseFormData = payload?.studentProof instanceof File;
    const requestPayload = shouldUseFormData ? new FormData() : payload;

    if (shouldUseFormData) {
      Object.entries(payload).forEach(([key, value]) => {
        if (value instanceof File) {
          requestPayload.append(key, value);
          return;
        }
        requestPayload.append(key, value ?? "");
      });
    }

    const response = await apiClient.post("/auth/register", requestPayload, shouldUseFormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined);
      
    if (response.data.requiresVerification) {
      return response.data;
    }
    
    localStorage.removeItem(COLLEGE_STORAGE_KEY);
    setSession(response.data.data);
    return response.data.data;
  }, []);

  const verifyRegistrationOtp = useCallback(async (email, otp) => {
    const response = await apiClient.post("/auth/verify-registration-otp", { email, otp });
    localStorage.removeItem(COLLEGE_STORAGE_KEY);
    setSession(response.data.data);
    return response.data.data;
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.token) {
      return null;
    }

    const response = await apiClient.get("/auth/me");
    setSession((current) => ({
      ...current,
      user: response.data.data
    }));
    return response.data.data;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const response = await apiClient.patch("/auth/me", payload);
    setSession((current) => ({
      ...current,
      user: response.data.data
    }));
    return response.data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const currentRefreshToken = parsed?.refreshToken || "";
      
      await apiClient.post("/auth/logout", { refreshToken: currentRefreshToken });
    } catch (error) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem(COLLEGE_STORAGE_KEY);
      setSession(null);
    }
  }, []);

  const stateValue = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.token),
      isBootstrapping,
    }),
    [isBootstrapping, session]
  );

  const dispatchValue = useMemo(
    () => ({
      login,
      verify2fa,
      register,
      verifyRegistrationOtp,
      updateProfile,
      refreshCurrentUser,
      logout
    }),
    [login, verify2fa, register, verifyRegistrationOtp, updateProfile, refreshCurrentUser, logout]
  );

  return (
    <AuthStateContext.Provider value={stateValue}>
      <AuthDispatchContext.Provider value={dispatchValue}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthStateContext.Provider>
  );
}

export function useAuthState() {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error("useAuthState must be used within AuthProvider");
  }
  return context;
}

export function useAuthDispatch() {
  const context = useContext(AuthDispatchContext);
  if (!context) {
    throw new Error("useAuthDispatch must be used within AuthProvider");
  }
  return context;
}

// Retained for backward compatibility
export function useAuth() {
  const state = useAuthState();
  const dispatch = useAuthDispatch();
  return { ...state, ...dispatch };
}
