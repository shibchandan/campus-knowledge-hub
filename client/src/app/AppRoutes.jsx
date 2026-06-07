import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { RoleRoute } from "../components/RoleRoute";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { AuthPage } from "../pages/AuthPage";
import { CollegeSelectorPage } from "../pages/CollegeSelectorPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ProgramDetailPage } from "../pages/ProgramDetailPage";
import { BranchSemesterPage } from "../pages/BranchSemesterPage";
import { SubjectResourcePage } from "../pages/SubjectResourcePage";
import { SubjectCategoryPage } from "../pages/SubjectCategoryPage";
import { LecturesPage } from "../pages/LecturesPage";
import { NotesPage } from "../pages/NotesPage";
import { QuizzesPage } from "../pages/QuizzesPage";
import { QuizArrangementPage } from "../pages/QuizArrangementPage";
import { AiStudioPage } from "../pages/AiStudioPage";
import { CommunityPage } from "../pages/CommunityPage";
import { MarketplacePage } from "../pages/MarketplacePage";
import { IntegrityPage } from "../pages/IntegrityPage";
import { PanelHomePage } from "../pages/PanelHomePage";
import { AdminPanelPage } from "../pages/AdminPanelPage";
import { RepresentativePanelPage } from "../pages/RepresentativePanelPage";
import { StudentPanelPage } from "../pages/StudentPanelPage";
import { AccountSettingsPage } from "../pages/AccountSettingsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
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
        <Route path="lectures" element={<ProtectedRoute><LecturesPage /></ProtectedRoute>} />
        <Route path="notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
        <Route path="quizzes" element={<ProtectedRoute><QuizzesPage /></ProtectedRoute>} />
        <Route path="quizzes/:quizId" element={<ProtectedRoute><QuizArrangementPage /></ProtectedRoute>} />
        <Route path="notes/quiz/:quizId" element={<ProtectedRoute><QuizArrangementPage /></ProtectedRoute>} />
        <Route path="ai-studio" element={<ProtectedRoute><AiStudioPage /></ProtectedRoute>} />
        <Route path="integrity" element={<ProtectedRoute><IntegrityPage /></ProtectedRoute>} />
        <Route path="marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
        <Route path="community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
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
