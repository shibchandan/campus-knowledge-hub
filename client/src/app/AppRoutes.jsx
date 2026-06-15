import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RoleRoute } from "../components/RoleRoute";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { AuthPage } from "../pages/AuthPage";
import { CollegeSelectorPage } from "../pages/CollegeSelectorPage";
import { useToast } from "../ui/ToastContext";
import { DashboardPage } from "../pages/DashboardPage";
import { ProgramDetailPage } from "../pages/ProgramDetailPage";
import { BranchSemesterPage } from "../pages/BranchSemesterPage";
import { SubjectResourcePage } from "../pages/SubjectResourcePage";
import { SubjectCategoryPage } from "../pages/SubjectCategoryPage";
import { LecturesPage } from "../pages/LecturesPage";
import { NotesPage } from "../pages/NotesPage";
import { QuizzesPage } from "../pages/QuizzesPage";
import { QuizArrangementPage } from "../pages/QuizArrangementPage";
import { QuizResultsPage } from "../pages/QuizResultsPage";
import { AiStudioPage } from "../pages/AiStudioPage";
import { CommunityPage } from "../pages/CommunityPage";
import { CommunityThreadPage } from "../pages/CommunityThreadPage";
import { AssignmentsPage } from "../pages/AssignmentsPage";
import { AssignmentThreadPage } from "../pages/AssignmentThreadPage";
import { MarketplacePage } from "../pages/MarketplacePage";
import { IntegrityPage } from "../pages/IntegrityPage";
import { PanelHomePage } from "../pages/PanelHomePage";
import { AdminPanelPage } from "../pages/AdminPanelPage";
import { RepresentativePanelPage } from "../pages/RepresentativePanelPage";
import { StudentPanelPage } from "../pages/StudentPanelPage";
import { AccountSettingsPage } from "../pages/AccountSettingsPage";
import { PrivacyPolicyPage } from "../pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "../pages/TermsOfServicePage";
import { SitemapPage } from "../pages/SitemapPage";

export function AppRoutes() {
  const { showError } = useToast();

  useEffect(() => {
    const handleNetworkError = () => {
      showError("Network Error: Cannot connect to the server. Please check your internet connection.");
    };

    const handleSessionExpired = () => {
      showError("Your session has expired. Please log in again.");
    };

    window.addEventListener("api-network-error", handleNetworkError);
    window.addEventListener("api-session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("api-network-error", handleNetworkError);
      window.removeEventListener("api-session-expired", handleSessionExpired);
    };
  }, [showError]);

  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/sitemap" element={<SitemapPage />} />
      <Route
        path="/"
        element={
          <DashboardLayout />
        }
      >
        <Route index element={<Navigate to="/colleges" replace />} />
        <Route path="colleges" element={<CollegeSelectorPage />} />
        <Route path="account" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="dashboard/:programId" element={<ProgramDetailPage />} />
        <Route path="dashboard/:programId/branch/:branchId" element={<BranchSemesterPage />} />
        <Route
          path="dashboard/:programId/branch/:branchId/:semesterId/:subjectId"
          element={<SubjectResourcePage />}
        />
        <Route
          path="dashboard/:programId/branch/:branchId/:semesterId/:subjectId/:categoryId"
          element={<SubjectCategoryPage />}
        />
        <Route path="lectures" element={<LecturesPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="quizzes" element={<QuizzesPage />} />
        <Route path="quizzes/:quizId" element={<QuizArrangementPage />} />
        <Route
          path="quizzes/:quizId/results"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["representative", "admin"]}>
                <QuizResultsPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route path="notes/quiz/:quizId" element={<QuizArrangementPage />} />
        <Route path="ai-studio" element={<AiStudioPage />} />
        <Route path="integrity" element={<IntegrityPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="community/:id" element={<CommunityThreadPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="assignments/:id" element={<AssignmentThreadPage />} />
        <Route path="panel" element={<ProtectedRoute><PanelHomePage /></ProtectedRoute>} />
        <Route
          path="panel/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["admin"]}>
                <AdminPanelPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="panel/representative"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["representative"]}>
                <RepresentativePanelPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="panel/student"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["student"]}>
                <StudentPanelPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
