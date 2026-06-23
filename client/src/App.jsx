import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthProvider } from "./auth/AuthContext";
import { CollegeProvider } from "./college/CollegeContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { ToastProvider } from "./ui/ToastContext";
import { ConfirmProvider } from "./ui/ConfirmContext";
import { ScrollToTop } from "./components/ScrollToTop";
import { AppRoutes } from "./app/AppRoutes";
import { SitemapPage } from "./pages/SitemapPage";

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
            </ConfirmProvider>
          </CollegeProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
