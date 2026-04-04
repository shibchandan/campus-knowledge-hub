import { AuthProvider } from "./auth/AuthContext";
import { CollegeProvider } from "./college/CollegeContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { ToastProvider } from "./ui/ToastContext";
import { AppRoutes } from "./app/AppRoutes";

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CollegeProvider>
            <AppRoutes />
          </CollegeProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
