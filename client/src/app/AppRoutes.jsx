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
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/colleges" replace />} />
        <Route path="colleges" element={<CollegeSelectorPage />} />
        <Route path="account" element={<AccountSettingsPage />} />
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
        <Route path="ai-studio" element={<AiStudioPage />} />
        <Route path="integrity" element={<IntegrityPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="panel" element={<PanelHomePage />} />
        <Route
          path="panel/admin"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminPanelPage />
            </RoleRoute>
          }
        />
        <Route
          path="panel/representative"
          element={
            <RoleRoute allowedRoles={["representative"]}>
              <RepresentativePanelPage />
            </RoleRoute>
          }
        />
        <Route
          path="panel/student"
          element={
            <RoleRoute allowedRoles={["student"]}>
              <StudentPanelPage />
            </RoleRoute>
          }
        />
      </Route>
    </Routes>
  );
}
