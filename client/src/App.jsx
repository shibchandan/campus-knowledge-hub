import { AuthProvider } from "./auth/AuthContext";
import { CollegeProvider } from "./college/CollegeContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { AppRoutes } from "./app/AppRoutes";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CollegeProvider>
          <AppRoutes />
        </CollegeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
