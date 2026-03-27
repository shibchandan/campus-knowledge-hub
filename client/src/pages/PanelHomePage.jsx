import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function PanelHomePage() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/panel/admin" replace />;
  }

  if (user.role === "representative") {
    return <Navigate to="/panel/representative" replace />;
  }

  return <Navigate to="/panel/student" replace />;
}
