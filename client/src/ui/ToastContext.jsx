import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

function createToast(message, tone = "info", duration = 3200) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    tone,
    duration
  };
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback(
    (message, tone = "info", duration = 3200) => {
      const toast = createToast(message, tone, duration);
      setToasts((current) => [...current, toast]);
      window.setTimeout(() => dismissToast(toast.id), duration);
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      showSuccess: (message, duration) => showToast(message, "success", duration),
      showError: (message, duration) => showToast(message, "error", duration),
      showInfo: (message, duration) => showToast(message, "info", duration)
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <article className={`toast-card ${toast.tone}`} key={toast.id} role="status">
            <p>{toast.message}</p>
            <button
              aria-label="Dismiss notification"
              className="toast-dismiss"
              onClick={() => dismissToast(toast.id)}
              type="button"
            >
              x
            </button>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
