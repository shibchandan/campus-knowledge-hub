import { createContext, useContext, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({});
  const resolveRef = useRef(null);

  const confirm = useCallback((opts) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) resolveRef.current(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) resolveRef.current(false);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "1rem",
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={handleCancel}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              style={{
                position: "relative",
                background: "var(--bg-panel, #1e293b)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
                width: "100%",
                maxWidth: "400px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.25rem", fontWeight: "600" }}>
                {options.title || "Confirm Action"}
              </h2>
              <p style={{ margin: 0, marginBottom: "1.5rem", color: "var(--color-slate-400-adaptive, #94a3b8)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                {options.message || "Are you sure you want to proceed?"}
              </p>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="action-button neutral"
                  onClick={handleCancel}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                >
                  {options.cancelText || "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    border: "none",
                    background: options.intent === "danger" ? "#ef4444" : "#3b82f6",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                  }}
                >
                  {options.confirmText || "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
