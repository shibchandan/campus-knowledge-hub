import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient, setAuthToken } from "../lib/apiClient";

const AUTH_STORAGE_KEY = "campus-knowledge-hub-auth";
const COLLEGE_STORAGE_KEY = "campus-knowledge-hub-college";

const AuthContext = createContext(null);

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

  async function login(credentials) {
    const response = await apiClient.post("/auth/login", credentials);
    localStorage.removeItem(COLLEGE_STORAGE_KEY);
    setSession(response.data.data);
    return response.data.data;
  }

  async function register(payload) {
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
    localStorage.removeItem(COLLEGE_STORAGE_KEY);
    setSession(response.data.data);
    return response.data.data;
  }

  async function refreshCurrentUser() {
    if (!session?.token) {
      return null;
    }

    const response = await apiClient.get("/auth/me");
    setSession((current) => ({
      ...current,
      user: response.data.data
    }));
    return response.data.data;
  }

  async function updateProfile(payload) {
    const response = await apiClient.patch("/auth/me", payload);
    setSession((current) => ({
      ...current,
      user: response.data.data
    }));
    return response.data.data;
  }

  function logout() {
    localStorage.removeItem(COLLEGE_STORAGE_KEY);
    setSession(null);
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.token),
      isBootstrapping,
      login,
      register,
      updateProfile,
      refreshCurrentUser,
      logout
    }),
    [isBootstrapping, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
