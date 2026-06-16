import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthProvider } from "./auth/AuthContext";
import { CollegeProvider } from "./college/CollegeContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { ToastProvider } from "./ui/ToastContext";
import { ScrollToTop } from "./components/ScrollToTop";
import { AppRoutes } from "./app/AppRoutes";
import { SitemapPage } from "./pages/SitemapPage";

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CollegeProvider>
            <ScrollToTop />
            <AppRoutes />
            <SpeedInsights />
          </CollegeProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
