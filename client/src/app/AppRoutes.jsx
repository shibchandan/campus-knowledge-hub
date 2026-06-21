import { useEffect } from "react";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RoleRoute } from "../components/RoleRoute";
import { DashboardLayout } from "../layouts/DashboardLayout";

// Lazy-loaded pages
const AuthPage = lazy(() => import("../pages/AuthPage").then(m => ({ default: m.AuthPage })));
const CollegeSelectorPage = lazy(() => import("../pages/CollegeSelectorPage").then(m => ({ default: m.CollegeSelectorPage })));
const DashboardPage = lazy(() => import("../pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const ProgramDetailPage = lazy(() => import("../pages/ProgramDetailPage").then(m => ({ default: m.ProgramDetailPage })));
const BranchSemesterPage = lazy(() => import("../pages/BranchSemesterPage").then(m => ({ default: m.BranchSemesterPage })));
const SubjectResourcePage = lazy(() => import("../pages/SubjectResourcePage").then(m => ({ default: m.SubjectResourcePage })));
const SubjectCategoryPage = lazy(() => import("../pages/SubjectCategoryPage").then(m => ({ default: m.SubjectCategoryPage })));
const LecturesPage = lazy(() => import("../pages/LecturesPage").then(m => ({ default: m.LecturesPage })));
const NotesPage = lazy(() => import("../pages/NotesPage").then(m => ({ default: m.NotesPage })));
const QuizzesPage = lazy(() => import("../pages/QuizzesPage").then(m => ({ default: m.QuizzesPage })));
const QuizArrangementPage = lazy(() => import("../pages/QuizArrangementPage").then(m => ({ default: m.QuizArrangementPage })));
const QuizResultsPage = lazy(() => import("../pages/QuizResultsPage").then(m => ({ default: m.QuizResultsPage })));
const AiStudioPage = lazy(() => import("../pages/AiStudioPage").then(m => ({ default: m.AiStudioPage })));
const CommunityPage = lazy(() => import("../pages/CommunityPage").then(m => ({ default: m.CommunityPage })));
const AssignmentsPage = lazy(() => import("../pages/AssignmentsPage").then(m => ({ default: m.AssignmentsPage })));
const AssignmentThreadPage = lazy(() => import("../pages/AssignmentThreadPage").then(m => ({ default: m.AssignmentThreadPage })));
const MarketplacePage = lazy(() => import("../pages/MarketplacePage").then(m => ({ default: m.MarketplacePage })));
const IntegrityPage = lazy(() => import("../pages/IntegrityPage").then(m => ({ default: m.IntegrityPage })));
const PanelHomePage = lazy(() => import("../pages/PanelHomePage").then(m => ({ default: m.PanelHomePage })));
const AdminPanelPage = lazy(() => import("../pages/AdminPanelPage").then(m => ({ default: m.AdminPanelPage })));
const RepresentativePanelPage = lazy(() => import("../pages/RepresentativePanelPage").then(m => ({ default: m.RepresentativePanelPage })));
const StudentPanelPage = lazy(() => import("../pages/StudentPanelPage").then(m => ({ default: m.StudentPanelPage })));
const AccountSettingsPage = lazy(() => import("../pages/AccountSettingsPage").then(m => ({ default: m.AccountSettingsPage })));
const PrivacyPolicyPage = lazy(() => import("../pages/PrivacyPolicyPage").then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import("../pages/TermsOfServicePage").then(m => ({ default: m.TermsOfServicePage })));
const SitemapPage = lazy(() => import("../pages/SitemapPage").then(m => ({ default: m.SitemapPage })));

import { useToast } from "../ui/ToastContext";

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
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary)', animation: 'spin 1s ease-in-out infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
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
    </Suspense>
  );
}
