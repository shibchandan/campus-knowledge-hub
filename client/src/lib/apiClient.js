import axios from "axios";

const AUTH_STORAGE_KEY = "campus-knowledge-hub-auth";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw);
    return parsed?.token || "";
  } catch {
    return "";
  }
}

export function buildAuthorizedApiUrl(rawUrl) {
  if (!rawUrl) {
    return "";
  }

  const token = getStoredAuthToken();
  if (!token) {
    return rawUrl;
  }

  const separator = rawUrl.includes("?") ? "&" : "?";
  return `${rawUrl}${separator}accessToken=${encodeURIComponent(token)}`;
}

export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      window.dispatchEvent(new CustomEvent("api-network-error"));
    } else if (error.response.status === 401) {
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("campus-knowledge-hub-auth");
        window.dispatchEvent(new CustomEvent("api-session-expired"));
        setTimeout(() => {
          window.location.href = "/login?expired=true";
        }, 1500);
      }
    }
    return Promise.reject(error);
  }
);

