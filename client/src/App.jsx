import { lazy, Suspense } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthProvider } from "./auth/AuthContext";
import { CollegeProvider } from "./college/CollegeContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { ToastProvider } from "./ui/ToastContext";
import { ConfirmProvider } from "./ui/ConfirmContext";
import { ScrollToTop } from "./components/ScrollToTop";
import { AppRoutes } from "./app/AppRoutes";

const Chatbot = lazy(() => import("./components/Chatbot").then(m => ({ default: m.Chatbot })));

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CollegeProvider>
            <ConfirmProvider>
              <ScrollToTop />
              <AppRoutes />
              <SpeedInsights />
              <Suspense fallback={null}>
                <Chatbot />
              </Suspense>
            </ConfirmProvider>
          </CollegeProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
