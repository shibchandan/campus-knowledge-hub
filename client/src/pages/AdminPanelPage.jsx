import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../ui/ConfirmContext";
import { SectionCard } from "../components/SectionCard";
import { apiClient, buildAuthorizedApiUrl } from "../lib/apiClient";
import { requestDeletePassword } from "../lib/deleteWithPassword";
import { useToast } from "../ui/ToastContext";
import { CourseForm } from "../components/forms/CourseForm";
import { StructureForm } from "../components/forms/StructureForm";
import { SubjectForm } from "../components/forms/SubjectForm";
import { NoticeForm } from "../components/forms/NoticeForm";
import { SkeletonCard, Spinner } from "../components/LoadingStates";
import { ChartCard, CustomPieChart, CustomBarChart } from "../components/charts/DataCharts";

const initialUserForm = {
  fullName: "",
  email: "",
  password: "",
  role: "student",
  status: "active",
  collegeName: "",
  collegeStudentId: ""
};

const initialNoticeForm = {
  collegeName: "",
  title: "",
  content: "",
  isPublished: true
};

const initialCourseForm = {
  collegeName: "",
  courseName: ""
};

const initialStructureForm = {
  collegeName: "",
  programId: "btech",
  programName: "BTech",
  branchId: "",
  branchName: "",
  branchDescription: "",
  semesterId: "",
  semesterName: "",
  semesterOrder: 1
};

const initialSubjectForm = {
  collegeName: "",
  programId: "btech",
  branchId: "",
  semesterId: "",
  subjectId: "",
  name: ""
};

const initialResourceEditForm = {
  title: "",
  description: "",
  textContent: ""
};

export function AdminPanelPage() {
  const { showError, showSuccess } = useToast();
  const { user: currentUser } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingEmailMigrations, setPendingEmailMigrations] = useState([]);
  const [approvedCourses, setApprovedCourses] = useState([]);
  const [notices, setNotices] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [structures, setStructures] = useState([]);
   const [resources, setResources] = useState([]);
  const [syllabusResources, setSyllabusResources] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiStatusLoading, setAiStatusLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [userForm, setUserForm] = useState(initialUserForm);
  const [noticeForm, setNoticeForm] = useState(initialNoticeForm);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [structureForm, setStructureForm] = useState(initialStructureForm);
  const [subjectForm, setSubjectForm] = useState(initialSubjectForm);
  const [resourceEditForm, setResourceEditForm] = useState(initialResourceEditForm);
  const [editingCourseId, setEditingCourseId] = useState("");
  const [editingStructureId, setEditingStructureId] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState("");
  const [editingNoticeId, setEditingNoticeId] = useState("");
  const [editingResourceId, setEditingResourceId] = useState("");

  const [requestSearch, setRequestSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [noticeSearch, setNoticeSearch] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceSort, setResourceSort] = useState("newest");
  const [auditSearch, setAuditSearch] = useState("");
  const [representativeSearch, setRepresentativeSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [structureSearch, setStructureSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [visibleAuditCount, setVisibleAuditCount] = useState(5);
  const [visibleStructureCount, setVisibleStructureCount] = useState(5);

  async function loadAdminData() {
    setLoading(true);
    setSecondaryLoading(true);
    setError("");

    try {
      // ── Phase 1: Critical data (4 calls) — page renders immediately after ──
      const [
        usersResponse,
        approvedResponse,
        analyticsResponse,
        emailMigrationsResponse
      ] = await Promise.all([
        apiClient.get("/auth/admin/users"),
        apiClient.get("/governance/approved-courses"),
        apiClient.get("/admin/analytics").catch(() => ({ data: { data: null } })),
        apiClient.get("/admin/email-migrations").catch(() => ({ data: { data: [] } }))
      ]);

      setPendingRequests([]);
      setUsers(usersResponse.data.data || []);
      setApprovedCourses(approvedResponse.data.data || []);
      setAnalytics(analyticsResponse?.data?.data || null);
      setPendingEmailMigrations(emailMigrationsResponse?.data?.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load admin control data.");
    } finally {
      setLoading(false); // ← Page renders here — user sees content fast
    }

    // ── Phase 2: Secondary data (6 calls) — loads silently in the background ──
    try {
      const [
        noticesResponse,
        structuresResponse,
        subjectsResponse,
        resourcesResponse,
        syllabusResponse,
        auditResponse
      ] = await Promise.all([
        apiClient.get("/notices", { params: { includeUnpublished: true } }),
        apiClient.get("/academic/structures"),
        apiClient.get("/academic/subjects"),
        apiClient.get("/resources", { params: { page: 1, limit: 20 } }),
        apiClient.get("/resources", { params: { page: 1, limit: 10, categoryId: "syllabus" } }),
        apiClient.get("/audit/logs", { params: { page: 1, limit: 10 } })
      ]);

      setNotices(noticesResponse.data.data || []);
      setStructures(structuresResponse.data.data || []);
      setSubjects(subjectsResponse.data.data || []);
      setResources(resourcesResponse.data.data?.items || []);
      setSyllabusResources(syllabusResponse.data.data?.items || []);
      setAuditLogs(auditResponse.data.data?.items || []);
    } catch {
      // Secondary data failure is non-critical — page already visible
    } finally {
      setSecondaryLoading(false);
    }

    // ── Phase 3: AI Status — lowest priority, fully background ──
    setAiStatusLoading(true);
    try {
      const aiStatusResponse = await apiClient.get("/ai/status");
      setAiStatus(aiStatusResponse.data.data || null);
    } catch {
      setAiStatus(null);
    } finally {
      setAiStatusLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function handleDecision(requestId, action) {
    clearMessages();
    try {
      await apiClient.patch(`/governance/requests/${requestId}/decision`, { action });
      setSuccess(`Request ${action}d successfully.`);
      showSuccess(`Request ${action}d successfully.`);
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update request.";
      setError(message);
      showError(message);
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    clearMessages();
    try {
      await apiClient.post("/auth/admin/users", userForm);
      setUserForm(initialUserForm);
      setSuccess("User created successfully.");
      showSuccess("User created successfully.");
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to create user.";
      setError(message);
      showError(message);
    }
  }

  async function handleUpdateUser(userId, updates) {
    clearMessages();

    const targetUser = users.find((item) => item.id === userId);
    const actionLabel = updates.role
      ? `change role to ${updates.role}`
      : updates.status
        ? `change status to ${updates.status}`
        : "update this user";

    const confirmed = window.confirm(
      `Do you want to ${actionLabel} for ${targetUser?.fullName || targetUser?.email || "this user"}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiClient.patch(`/auth/admin/users/${userId}`, updates);
      setSuccess("User updated successfully.");
      showSuccess("User updated successfully.");
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update user.";
      setError(message);
      showError(message);
    }
  }

  async function handleEmailMigrationDecision(userId, action) {
    clearMessages();
    try {
      await apiClient.post(`/admin/email-migrations/${userId}`, { action });
      setSuccess(`Email migration ${action}d successfully.`);
      showSuccess(`Email migration ${action}d successfully.`);
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to process email migration.";
      setError(message);
      showError(message);
    }
  }

  async function handleAssignCollege(user) {
    clearMessages();
    const nextCollegeName = window.prompt(
      `Assign college for ${user.fullName}. Leave empty to remove college binding.`,
      user.collegeName || ""
    );

    if (nextCollegeName === null) {
      return;
    }

    try {
      await apiClient.patch(`/auth/admin/users/${user.id}`, {
        collegeName: nextCollegeName
      });
      setSuccess("User college updated successfully.");
      showSuccess("User college updated successfully.");
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update user college.";
      setError(message);
      showError(message);
    }
  }

  async function handleSaveNotice(event) {
    event.preventDefault();
    clearMessages();
    try {
      if (editingNoticeId) {
        await apiClient.patch(`/notices/${editingNoticeId}`, noticeForm);
        setSuccess("Notice updated successfully.");
        showSuccess("Notice updated successfully.");
      } else {
        await apiClient.post("/notices", noticeForm);
        setSuccess("Notice created successfully.");
        showSuccess("Notice created successfully.");
      }
      setNoticeForm(initialNoticeForm);
      setEditingNoticeId("");
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to save notice.";
      setError(message);
      showError(message);
    }
  }

  function resetCourseForm() {
    setCourseForm(initialCourseForm);
    setEditingCourseId("");
  }

  function resetStructureForm() {
    setStructureForm(initialStructureForm);
    setEditingStructureId("");
  }

  function resetSubjectForm() {
    setSubjectForm(initialSubjectForm);
    setEditingSubjectId("");
  }

  async function handleSaveCourse(event) {
    event.preventDefault();
    clearMessages();
    try {
      const payload = {
        ...courseForm
      };

      if (editingCourseId) {
        await apiClient.patch(`/governance/approved-courses/${editingCourseId}`, payload);
        setSuccess("College course updated successfully.");
        showSuccess("College course updated successfully.");
      } else {
        await apiClient.post("/governance/approved-courses", payload);
        setSuccess("College course created successfully.");
        showSuccess("College course created successfully.");
      }

      resetCourseForm();
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to save college course.";
      setError(message);
      showError(message);
    }
  }

  function handleEditCourse(course) {
    setEditingCourseId(course._id);
    setCourseForm({
      collegeName: course.collegeName || "",
      courseName: course.courseName || ""
    });
    clearMessages();
  }

  async function handleDeleteCourse(courseId) {
    const course = approvedCourses.find(c => c._id === courseId);
    const isConfirmed = await confirm({
      title: "Delete Course",
      message: `Are you sure you want to delete the approved course "${course?.courseName || 'Unknown'}"?`,
      confirmText: "Delete Course",
      intent: "danger"
    });
    if (!isConfirmed) return;

    const currentPassword = requestDeletePassword("this college course");
    if (!currentPassword) {
      return;
    }
    clearMessages();
    try {
      await apiClient.delete(`/governance/approved-courses/${courseId}`, {
        data: { currentPassword }
      });
      setSuccess("College course deleted successfully.");
      showSuccess("College course deleted successfully.");
      if (editingCourseId === courseId) {
        resetCourseForm();
      }
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete college course.";
      setError(message);
      showError(message);
    }
  }

  async function handleSaveStructure(event) {
    event.preventDefault();
    clearMessages();
    try {
      const payload = {
        ...structureForm,
        semesterOrder: Number(structureForm.semesterOrder)
      };

      if (editingStructureId) {
        await apiClient.patch(`/academic/structures/${editingStructureId}`, payload);
        setSuccess("Academic structure updated successfully.");
        showSuccess("Academic structure updated successfully.");
      } else {
        await apiClient.post("/academic/structures", payload);
        setSuccess("Academic structure created successfully.");
        showSuccess("Academic structure created successfully.");
      }

      resetStructureForm();
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to save academic structure.";
      setError(message);
      showError(message);
    }
  }

  function handleEditStructure(structure) {
    setEditingStructureId(structure._id);
    setStructureForm({
      collegeName: structure.collegeName || "",
      programId: structure.programId || "btech",
      programName: structure.programName || "",
      branchId: structure.branchId || "",
      branchName: structure.branchName || "",
      branchDescription: structure.branchDescription || "",
      semesterId: structure.semesterId || "",
      semesterName: structure.semesterName || "",
      semesterOrder: Number(structure.semesterOrder || 1)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    clearMessages();
  }

  async function handleDeleteStructure(structureId) {
    const structure = structures.find(s => s._id === structureId);
    const isConfirmed = await confirm({
      title: "Delete Structure",
      message: `Are you sure you want to delete the structure for branch "${structure?.branchId || 'Unknown'}"?`,
      confirmText: "Delete Structure",
      intent: "danger"
    });
    if (!isConfirmed) return;

    const currentPassword = requestDeletePassword("this academic structure");
    if (!currentPassword) {
      return;
    }
    clearMessages();
    try {
      await apiClient.delete(`/academic/structures/${structureId}`, {
        data: { currentPassword }
      });
      setSuccess("Academic structure deleted successfully.");
      showSuccess("Academic structure deleted successfully.");
      if (editingStructureId === structureId) {
        resetStructureForm();
      }
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete academic structure.";
      setError(message);
      showError(message);
    }
  }

  async function handleSaveSubject(event) {
    event.preventDefault();
    clearMessages();
    try {
      if (editingSubjectId) {
        await apiClient.patch(`/academic/subjects/${editingSubjectId}`, subjectForm);
        setSuccess("Subject updated successfully.");
        showSuccess("Subject updated successfully.");
      } else {
        await apiClient.post("/academic/subjects", subjectForm);
        setSuccess("Subject created successfully.");
        showSuccess("Subject created successfully.");
      }

      resetSubjectForm();
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to save subject.";
      setError(message);
      showError(message);
    }
  }

  function handleEditSubject(subject) {
    setEditingSubjectId(subject._id);
    setSubjectForm({
      collegeName: subject.collegeName || "",
      programId: subject.programId || "btech",
      branchId: subject.branchId || "",
      semesterId: subject.semesterId || "",
      subjectId: subject.subjectId || "",
      name: subject.name || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    clearMessages();
  }

  async function handleDeleteSubject(subjectId) {
    const subject = subjects.find(s => s._id === subjectId);
    const isConfirmed = await confirm({
      title: "Delete Subject",
      message: `Are you sure you want to delete "${subject?.name || 'Unknown'}"?`,
      confirmText: "Delete Subject",
      intent: "danger"
    });
    if (!isConfirmed) return;

    const currentPassword = requestDeletePassword("this subject");
    if (!currentPassword) {
      return;
    }
    clearMessages();
    try {
      await apiClient.delete(`/academic/subjects/${subjectId}`, {
        data: { currentPassword }
      });
      setSuccess("Subject deleted successfully.");
      showSuccess("Subject deleted successfully.");
      if (editingSubjectId === subjectId) {
        resetSubjectForm();
      }
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete subject.";
      setError(message);
      showError(message);
    }
  }

  async function handleDeleteNotice(noticeId) {
    const notice = notices.find(n => n._id === noticeId);
    const isConfirmed = await confirm({
      title: "Delete Notice",
      message: `Are you sure you want to delete notice "${notice?.title || 'Unknown'}"?`,
      confirmText: "Delete Notice",
      intent: "danger"
    });
    if (!isConfirmed) return;

    const currentPassword = requestDeletePassword("this notice");
    if (!currentPassword) {
      return;
    }
    clearMessages();
    try {
      await apiClient.delete(`/notices/${noticeId}`, { data: { currentPassword } });
      setSuccess("Notice deleted successfully.");
      showSuccess("Notice deleted successfully.");
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete notice.";
      setError(message);
      showError(message);
    }
  }

  async function handleSaveResource(event) {
    event.preventDefault();
    clearMessages();
    try {
      await apiClient.patch(`/resources/${editingResourceId}`, resourceEditForm);
      setSuccess("Resource updated successfully.");
      showSuccess("Resource updated successfully.");
      setEditingResourceId("");
      setResourceEditForm(initialResourceEditForm);
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update resource.";
      setError(message);
      showError(message);
    }
  }

  async function handleDeleteResource(resourceId) {
    const resource = resources.find(r => r._id === resourceId);
    const isConfirmed = await confirm({
      title: "Delete Resource",
      message: `Are you sure you want to completely delete "${resource?.title || 'this resource'}"? This action cannot be undone.`,
      confirmText: "Delete Resource",
      intent: "danger"
    });
    if (!isConfirmed) return;

    const currentPassword = requestDeletePassword("this resource");
    if (!currentPassword) {
      return;
    }
    clearMessages();
    try {
      await apiClient.delete(`/resources/${resourceId}`, { data: { currentPassword } });
      setSuccess("Resource deleted successfully.");
      showSuccess("Resource deleted successfully.");
      await loadAdminData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete resource.";
      setError(message);
      showError(message);
    }
  }

  const filteredRequests = useMemo(() => {
    const term = requestSearch.trim().toLowerCase();
    return pendingRequests.filter(
      (request) =>
        !term ||
        request.collegeName?.toLowerCase().includes(term) ||
        request.courseName?.toLowerCase().includes(term) ||
        request.representative?.fullName?.toLowerCase().includes(term) ||
        request.representative?.email?.toLowerCase().includes(term)
    );
  }, [pendingRequests, requestSearch]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !term ||
        user.fullName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term);
      const matchesRole = userRoleFilter === "all" || user.role === userRoleFilter;
      const matchesStatus = userStatusFilter === "all" || user.status === userStatusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [userRoleFilter, userSearch, userStatusFilter, users]);

  const filteredNotices = useMemo(() => {
    const term = noticeSearch.trim().toLowerCase();
    return notices.filter(
      (notice) =>
        !term ||
        notice.title?.toLowerCase().includes(term) ||
        notice.content?.toLowerCase().includes(term) ||
        (notice.collegeName || "global").toLowerCase().includes(term)
    );
  }, [noticeSearch, notices]);

  const filteredResources = useMemo(() => {
    const term = resourceSearch.trim().toLowerCase();
    const items = resources.filter(
      (resource) =>
        !term ||
        resource.title?.toLowerCase().includes(term) ||
        resource.collegeName?.toLowerCase().includes(term) ||
        resource.subjectId?.toLowerCase().includes(term) ||
        resource.categoryId?.toLowerCase().includes(term)
    );

    items.sort((left, right) => {
      if (resourceSort === "title-asc") {
        return (left.title || "").localeCompare(right.title || "");
      }
      if (resourceSort === "category-asc") {
        return (left.categoryId || "").localeCompare(right.categoryId || "");
      }
      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });

    return items;
  }, [resourceSearch, resourceSort, resources]);

  const filteredRepresentativeDirectory = useMemo(() => {
    const term = representativeSearch.trim().toLowerCase();

    return approvedCourses.filter((course) => {
      const representativeName = course.addedByRepresentative?.fullName || "";
      const representativeEmail = course.addedByRepresentative?.email || "";
      const representativeStatus = course.addedByRepresentative?.status || "unknown";

      if (!term) {
        return true;
      }

      return (
        course.collegeName?.toLowerCase().includes(term) ||
        course.courseName?.toLowerCase().includes(term) ||
        representativeName.toLowerCase().includes(term) ||
        representativeEmail.toLowerCase().includes(term) ||
        representativeStatus.toLowerCase().includes(term)
      );
    });
  }, [approvedCourses, representativeSearch]);

  const filteredCourses = useMemo(() => {
    const term = courseSearch.trim().toLowerCase();
    return approvedCourses.filter(
      (course) =>
        !term ||
        course.collegeName?.toLowerCase().includes(term) ||
        course.courseName?.toLowerCase().includes(term)
    );
  }, [approvedCourses, courseSearch]);

  const filteredStructures = useMemo(() => {
    const term = structureSearch.trim().toLowerCase();
    return structures.filter(
      (structure) =>
        !term ||
        structure.collegeName?.toLowerCase().includes(term) ||
        structure.programId?.toLowerCase().includes(term) ||
        structure.branchName?.toLowerCase().includes(term) ||
        structure.semesterName?.toLowerCase().includes(term)
    );
  }, [structureSearch, structures]);

  const filteredSubjects = useMemo(() => {
    const term = subjectSearch.trim().toLowerCase();
    return subjects.filter(
      (subject) =>
        !term ||
        subject.collegeName?.toLowerCase().includes(term) ||
        subject.programId?.toLowerCase().includes(term) ||
        subject.branchId?.toLowerCase().includes(term) ||
        subject.semesterId?.toLowerCase().includes(term) ||
        subject.name?.toLowerCase().includes(term) ||
        subject.subjectId?.toLowerCase().includes(term)
    );
  }, [subjectSearch, subjects]);

  const filteredAuditLogs = useMemo(() => {
    const term = auditSearch.trim().toLowerCase();
    return auditLogs.filter(
      (log) =>
        !term ||
        log.action?.toLowerCase().includes(term) ||
        log.entityType?.toLowerCase().includes(term) ||
        log.actorUserId?.fullName?.toLowerCase().includes(term) ||
        log.actorUserId?.email?.toLowerCase().includes(term)
    );
  }, [auditLogs, auditSearch]);

  const metrics = useMemo(
    () => [
      { label: "Representative Users", value: users.filter((user) => user.role === "representative").length, note: "Approved representative accounts" },
      { label: "Total Users", value: users.length, note: "All account roles" },
      { label: "Active Users", value: users.filter((user) => user.status === "active").length, note: "Currently allowed access" },
      { label: "Approved Colleges", value: approvedCourses.length, note: "Available to students" },
      { label: "Published Notices", value: notices.filter((notice) => notice.isPublished).length, note: "Live announcements" },
      { label: "Managed Resources", value: resources.length, note: "Current moderation list" }
    ],
    [approvedCourses.length, notices, resources.length, users]
  );

  const adminCollegeNames = useMemo(
    () => [...new Set(approvedCourses.map((item) => item.collegeName).filter(Boolean))],
    [approvedCourses]
  );

  const structureProgramsForCollege = useMemo(
    () =>
      approvedCourses
        .filter((item) => item.collegeName === structureForm.collegeName)
        .map((item) => item.courseName)
        .filter(Boolean),
    [approvedCourses, structureForm.collegeName]
  );

  const subjectProgramsForCollege = useMemo(
    () =>
      approvedCourses
        .filter((item) => item.collegeName === subjectForm.collegeName)
        .map((item) => item.courseName)
        .filter(Boolean),
    [approvedCourses, subjectForm.collegeName]
  );

  return (
    <div className="dense-admin">
      <div className="page-stack">
        <SectionCard
        title="Admin Control Center & Analytics Dashboard"
        description="High-level metrics and central oversight for the entire platform."
      >
        {error ? <p className="auth-error">{error}</p> : null}
        {success ? <p className="success-note">{success}</p> : null}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
            <SkeletonCard count={1} style={{ height: "300px" }} />
            <SkeletonCard count={1} style={{ height: "300px" }} />
          </div>
        ) : analytics ? (
          <div className="analytics-dashboard">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              <ChartCard 
                title="User Demographics" 
                subtitle={`${analytics.totalUsers} Total Users (${analytics.activeUsers} Active)`}
                icon="👥"
              >
                <CustomPieChart 
                  data={[
                    { name: 'Students', value: analytics.roleDistribution?.students || 0 },
                    { name: 'Representatives', value: analytics.roleDistribution?.representatives || 0 }
                  ]} 
                />
              </ChartCard>

              <ChartCard 
                title="Platform Activity" 
                subtitle={`Total resources and active operations`}
                icon="⚡"
              >
                <CustomBarChart 
                  data={[
                    { name: 'Resources', total: analytics.totalResources, new: analytics.resourcesThisWeek },
                    { name: 'Colleges', total: analytics.totalColleges, new: 0 },
                    { name: 'Reports', total: analytics.activeReports, new: 0 }
                  ]}
                  bars={[
                    { dataKey: "total", name: "Total Count", color: "#6366f1" },
                    { dataKey: "new", name: "New This Week", color: "#10b981" }
                  ]}
                />
              </ChartCard>
            </div>
            
            <div className="analytics-cards">
              <article className="analytics-card gradient-primary">
                <div className="analytics-card-icon">👥</div>
                <div className="analytics-card-content">
                  <p className="analytics-label">Total Users</p>
                  <h3 className="analytics-value">{analytics.totalUsers}</h3>
                  <p className="analytics-note">{analytics.activeUsers} Active</p>
                </div>
              </article>
              <article className="analytics-card">
                <div className="analytics-card-icon">🎓</div>
                <div className="analytics-card-content">
                  <p className="analytics-label">Pending Requests</p>
                  <h3 className="analytics-value">{analytics.pendingRequests || 0}</h3>
                  {analytics.pendingRequests > 0 && (
                    <p className="analytics-note warning">Requires Admin Review</p>
                  )}
                </div>
              </article>
              <article className="analytics-card gradient-success">
                <div className="analytics-card-icon">📚</div>
                <div className="analytics-card-content">
                  <p className="analytics-label">Total Resources</p>
                  <h3 className="analytics-value">{analytics.totalResources}</h3>
                  <p className="analytics-note">+{analytics.resourcesThisWeek} this week</p>
                </div>
              </article>
              <article className="analytics-card">
                <div className="analytics-card-icon">⚠️</div>
                <div className="analytics-card-content">
                  <p className="analytics-label">Active Reports</p>
                  <h3 className="analytics-value">{analytics.activeReports}</h3>
                  {analytics.activeReports > 0 ? (
                    <p className="analytics-note danger">Needs Review</p>
                  ) : (
                    <p className="analytics-note success">All clear</p>
                  )}
                </div>
              </article>
            </div>
          </div>
        ) : (
          <div className="stat-grid">
            {metrics.map((metric) => (
              <article className="stat-card" key={metric.label}>
                <p className="stat-label">{metric.label}</p>
                <h3>{metric.value}</h3>
                <p className="muted">{metric.note}</p>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="AI Provider Status"
        description="Checks whether the configured provider is reachable and ready for campus-grounded responses."
      >
        {aiStatusLoading ? (
          <p className="muted">Verifying AI provider integration status in the background...</p>
        ) : aiStatus ? (
          <div className="detail-grid">
            <article className="detail-card">
              <h3>Provider</h3>
              <p>{aiStatus.provider || "Not configured"}</p>
            </article>
            <article className="detail-card">
              <h3>Model</h3>
              <p>{aiStatus.model || "Not configured"}</p>
            </article>
            <article className="detail-card">
              <h3>Configured</h3>
              <p>{aiStatus.configured ? "Yes" : "No"}</p>
            </article>
            <article className="detail-card">
              <h3>Verified</h3>
              <p>{aiStatus.verified ? "Verified" : "Not verified"}</p>
            </article>
            <article className="detail-card">
              <h3>Status Message</h3>
              <p>{aiStatus.message}</p>
            </article>
          </div>
        ) : (
          <p className="muted">Unable to load AI provider status.</p>
        )}
      </SectionCard>

      <SectionCard title="Recent Audit Activity" description="Search sensitive actions and who performed them.">
        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => {
              setAuditSearch(event.target.value);
              setVisibleAuditCount(5); // Reset to 5 when user searches
            }}
            placeholder="Search action, entity, or actor..."
            type="text"
            value={auditSearch}
          />
          <p className="muted">{filteredAuditLogs.length} records visible</p>
        </div>
        <div className="panel-list audit-scroll-container">
          {loading ? (
            <SkeletonCard count={3} />
          ) : (
            filteredAuditLogs.slice(0, visibleAuditCount).map((log) => (
              <article className="panel-card" key={log._id}>
                <h3>{log.action}</h3>
                <p className="muted">
                  {log.entityType} | {log.actorUserId?.fullName || log.actorUserId?.email || "System"}
                </p>
                <p className="muted">{new Date(log.createdAt).toLocaleString()}</p>
              </article>
            ))
          )}
        </div>
        {filteredAuditLogs.length > visibleAuditCount ? (
          <div className="panel-actions" style={{ justifyContent: "center", marginTop: "16px" }}>
            <button
              type="button"
              className="action-button neutral"
              onClick={() => setVisibleAuditCount((prev) => prev + 10)}
            >
              Load More
            </button>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="College Representative Directory"
        description="See which approved college-course entries are currently managed by which representative and whether that representative is active."
      >
        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setRepresentativeSearch(event.target.value)}
            placeholder="Search college, course, representative, email, or status..."
            type="text"
            value={representativeSearch}
          />
          <p className="muted">{filteredRepresentativeDirectory.length} records visible</p>
        </div>
        <div className="panel-list">
          {filteredRepresentativeDirectory.map((course) => {
            const representative = course.addedByRepresentative;
            const representativeStatus = representative?.status || "unknown";
            const isActiveRepresentative =
              representative?.role === "representative" && representativeStatus === "active";

            return (
              <article className="panel-card" key={course._id}>
                <h3>{course.collegeName}</h3>
              <p className="muted">Course: {course.courseName} | Semester count is branch-defined</p>
                <p className="muted">
                  Representative: {representative?.fullName || "No representative"} ({representative?.email || "Not available"})
                </p>
                <p className={`status-chip ${isActiveRepresentative ? "approved" : representativeStatus === "suspended" || representativeStatus === "banned" ? "rejected" : "pending"}`}>
                  {isActiveRepresentative
                    ? "Active Representative"
                    : representative
                      ? `Representative ${representativeStatus}`
                      : "Representative Missing"}
                </p>
                <p className="muted">
                  Approved by: {course.approvedByAdmin?.fullName || course.approvedByAdmin?.email || "Admin"}
                </p>
              </article>
            );
          })}
          {!filteredRepresentativeDirectory.length ? (
            <p className="muted">No representative records matched your search.</p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="College & Course Setup"
        description="Admin can add a new college course directly, or edit and delete any approved course record."
      >
        <CourseForm
          formValue={courseForm}
          onChange={(key, val) => setCourseForm((current) => ({ ...current, [key]: val }))}
          onSubmit={handleSaveCourse}
          onCancel={resetCourseForm}
          isEditing={Boolean(editingCourseId)}
        />

        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setCourseSearch(event.target.value)}
            placeholder="Search college or course..."
            type="text"
            value={courseSearch}
          />
          <p className="muted">{filteredCourses.length} course records visible</p>
        </div>

        <div className="panel-list">
          {filteredCourses.map((course) => (
            <article className="panel-card" key={course._id}>
              <h3>{course.collegeName}</h3>
              <p className="muted">
                {course.courseName} | Semester count is branch-defined
              </p>
              <p className="muted">
                Representative: {course.addedByRepresentative?.fullName || "Admin"} | Approved by:{" "}
                {course.approvedByAdmin?.fullName || "Admin"}
              </p>
              <div className="panel-actions">
                <button className="action-button approve" onClick={() => handleEditCourse(course)} type="button">
                  Edit Course
                </button>
                <button className="action-button reject" onClick={() => handleDeleteCourse(course._id)} type="button">
                  Delete Course
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Academic Structure Management"
        description="Admin can create branches and semesters for any approved college course."
      >
        <StructureForm
          formValue={structureForm}
          onChange={(key, val) =>
            setStructureForm((current) => {
              const next = { ...current, [key]: val };
              if (key === "collegeName") {
                next.programId = "";
                next.programName = "";
              } else if (key === "programId") {
                next.programName = val;
              }
              return next;
            })
          }
          onSubmit={handleSaveStructure}
          onCancel={resetStructureForm}
          isEditing={Boolean(editingStructureId)}
          collegesList={adminCollegeNames}
          programsList={structureProgramsForCollege}
        />

        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => {
              setStructureSearch(event.target.value);
              setVisibleStructureCount(5); // Reset to 5 on search
            }}
            placeholder="Search college, program, branch, or semester..."
            type="text"
            value={structureSearch}
          />
          <p className="muted">{filteredStructures.length} structures visible</p>
        </div>

        <div className="panel-list structure-scroll-container">
          {loading ? (
            <SkeletonCard count={3} />
          ) : (
            filteredStructures.slice(0, visibleStructureCount).map((structure) => (
              <article className="panel-card" key={structure._id}>
                <h3>{structure.branchName}</h3>
                <p className="muted">
                  {structure.collegeName} | {structure.programName} | {structure.semesterName}
                </p>
                <p className="muted">
                  Branch ID: {structure.branchId} | Semester ID: {structure.semesterId} | Order: {structure.semesterOrder}
                </p>
                <div className="panel-actions">
                  <button className="action-button approve" onClick={() => handleEditStructure(structure)} type="button">
                    Edit Structure
                  </button>
                  <button className="action-button reject" onClick={() => handleDeleteStructure(structure._id)} type="button">
                    Delete Structure
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
        {filteredStructures.length > visibleStructureCount ? (
          <div className="panel-actions" style={{ justifyContent: "center", marginTop: "16px" }}>
            <button
              type="button"
              className="action-button neutral"
              onClick={() => setVisibleStructureCount((prev) => prev + 10)}
            >
              Load More
            </button>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Subject Management"
        description="Admin can create semester-wise subjects for any approved college course."
      >
        <SubjectForm
          formValue={subjectForm}
          onChange={(key, val) =>
            setSubjectForm((current) => {
              const next = { ...current, [key]: val };
              if (key === "collegeName") {
                next.programId = "";
              }
              return next;
            })
          }
          onSubmit={handleSaveSubject}
          onCancel={resetSubjectForm}
          isEditing={Boolean(editingSubjectId)}
          collegesList={adminCollegeNames}
          programsList={subjectProgramsForCollege}
        />

        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setSubjectSearch(event.target.value)}
            placeholder="Search subject, branch, semester, or college..."
            type="text"
            value={subjectSearch}
          />
          <p className="muted">{filteredSubjects.length} subjects visible</p>
        </div>

        <div className="panel-list">
          {filteredSubjects.map((subject) => (
            <article className="panel-card" key={subject._id}>
              <h3>{subject.name}</h3>
              <p className="muted">
                {subject.collegeName} | {subject.programId} | {subject.branchId} | {subject.semesterId}
              </p>
              <p className="muted">Subject ID: {subject.subjectId}</p>
              <div className="panel-actions">
                <button className="action-button approve" onClick={() => handleEditSubject(subject)} type="button">
                  Edit Subject
                </button>
                <button className="action-button reject" onClick={() => handleDeleteSubject(subject._id)} type="button">
                  Delete Subject
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Email Migration Requests" description="Review and approve requests from Representatives to migrate their accounts to a new email.">
        <div className="panel-list">
          {pendingEmailMigrations.map((migration) => (
            <article className="panel-card" key={migration._id}>
              <h3>{migration.fullName}</h3>
              <p className="muted">Current Email: {migration.email}</p>
              <p className="muted">Requested New Email: <strong>{migration.pendingEmailMigration}</strong></p>
              <p className="muted">College: {migration.collegeName || "Not assigned"}</p>
              <p className="muted">Requested on: {new Date(migration.createdAt).toLocaleDateString()}</p>
              <div className="panel-actions">
                <button
                  className="action-button approve"
                  onClick={() => handleEmailMigrationDecision(migration._id, "approve")}
                  type="button"
                >
                  Approve Migration
                </button>
                <button
                  className="action-button reject"
                  onClick={() => handleEmailMigrationDecision(migration._id, "reject")}
                  type="button"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
          {!pendingEmailMigrations.length ? (
            <p className="muted">No pending email migration requests.</p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="User Management" description="Create users and control role/status safely.">
        <form className="panel-form" onSubmit={handleCreateUser}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>Full Name</span>
              <input
                onChange={(event) => setUserForm((current) => ({ ...current, fullName: event.target.value }))}
                required
                type="text"
                value={userForm.fullName}
              />
            </label>
            <label className="auth-field">
              <span>Email</span>
              <input
                onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                required
                type="email"
                value={userForm.email}
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                required
                type="password"
                value={userForm.password}
              />
            </label>
            <label className="auth-field">
              <span>Role</span>
              <select onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))} value={userForm.role}>
                <option value="student">Student</option>
                <option value="representative">Representative</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Status</span>
              <select onChange={(event) => setUserForm((current) => ({ ...current, status: event.target.value }))} value={userForm.status}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </label>
            <label className="auth-field">
              <span>Assigned College</span>
              <input
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, collegeName: event.target.value }))
                }
                placeholder="Optional for admin/rep, recommended for student"
                type="text"
                value={userForm.collegeName}
              />
            </label>
            <label className="auth-field">
              <span>College ID</span>
              <input
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, collegeStudentId: event.target.value.toUpperCase() }))
                }
                placeholder="Recommended for student verification"
                type="text"
                value={userForm.collegeStudentId}
              />
            </label>
          </div>
          <button className="auth-submit" type="submit">Create User</button>
        </form>

        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Search name or email..."
            type="text"
            value={userSearch}
          />
          <select className="college-search" onChange={(event) => setUserRoleFilter(event.target.value)} value={userRoleFilter}>
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="representative">Representative</option>
            <option value="admin">Admin</option>
          </select>
          <select className="college-search" onChange={(event) => setUserStatusFilter(event.target.value)} value={userStatusFilter}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        <div className="panel-list">
          {filteredUsers.map((user) => (
            <article className="panel-card" key={user.id}>
              <h3>{user.fullName}</h3>
              <p className="muted">{user.email}</p>
              <p className="muted">Role: {user.role} | Status: {user.status}</p>
              {user.role === "representative" ? (
                <p className="muted">Represented college: {user.collegeName || "Not assigned"}</p>
              ) : user.representativeRequestStatus === "pending" ? (
                <>
                  <p className="muted">Assigned college: {user.collegeName || "Not assigned"}</p>
                  <p className="muted">Requested college to represent: {user.collegeName || "Not specified"}</p>
                  <p className="muted">College ID: {user.collegeStudentId || "Not added"}</p>
                </>
              ) : (
                <>
                  <p className="muted">Assigned college: {user.collegeName || "Not assigned"}</p>
                  <p className="muted">College ID: {user.collegeStudentId || "Not added"}</p>
                </>
              )}
              <p className="muted">
                Official college email: {user.officialCollegeEmail || "Not added"} |{" "}
                {user.officialCollegeEmailVerified ? "Verified" : "Not verified"}
              </p>
              {user.studentProofUrl ? (
                <p className="muted">
                  <a href={buildAuthorizedApiUrl(user.studentProofUrl)} rel="noreferrer" target="_blank">
                    Open proof: {user.studentProofOriginalName || "student-proof"}
                  </a>
                </p>
              ) : (
                <p className="muted">Proof document: Not uploaded</p>
              )}
              {user.role === "student" ? (
                <p
                  className={`status-chip ${
                    user.studentVerificationStatus === "verified"
                      ? "approved"
                      : user.studentVerificationStatus === "rejected"
                        ? "rejected"
                        : user.studentVerificationStatus === "pending"
                          ? "pending"
                          : "pending"
                  }`}
                >
                  Student verification: {user.studentVerificationStatus || "none"}
                </p>
              ) : null}
              {user.representativeRequestStatus && user.representativeRequestStatus !== "none" ? (
                <p className={`status-chip ${user.representativeRequestStatus === "pending" ? "pending" : user.representativeRequestStatus === "approved" ? "approved" : "rejected"}`}>
                  Representative request: {user.representativeRequestStatus}
                </p>
              ) : null}
              <div className="panel-actions">
                {user.representativeRequestStatus === "pending" ? (
                  <button
                    className="action-button approve"
                    onClick={() =>
                      handleUpdateUser(user.id, {
                        role: "representative",
                        representativeRequestStatus: "approved"
                      })
                    }
                    type="button"
                  >
                    Approve Rep Request
                  </button>
                ) : null}
                {user.representativeRequestStatus === "pending" ? (
                  <button
                    className="action-button reject"
                    onClick={() =>
                      handleUpdateUser(user.id, {
                        role: "student",
                        representativeRequestStatus: "rejected"
                      })
                    }
                    type="button"
                  >
                    Reject Rep Request
                  </button>
                ) : null}
                {user.role !== "admin" ? (
                  <button className="action-button approve" onClick={() => handleUpdateUser(user.id, { role: "admin" })} type="button">
                    Make Admin
                  </button>
                ) : null}
                {user.role !== "representative" && currentUser?.id !== user.id ? (
                  <button className="action-button neutral" onClick={() => handleUpdateUser(user.id, { role: "representative" })} type="button">
                    Make Rep
                  </button>
                ) : null}
                {user.role !== "student" && currentUser?.id !== user.id ? (
                  <button className="action-button neutral" onClick={() => handleUpdateUser(user.id, { role: "student" })} type="button">
                    Make Student
                  </button>
                ) : null}
                {user.status !== "suspended" && currentUser?.id !== user.id ? (
                  <button className="action-button reject" onClick={() => handleUpdateUser(user.id, { status: "suspended" })} type="button">
                    Suspend
                  </button>
                ) : null}
                {user.status !== "banned" && currentUser?.id !== user.id ? (
                  <button className="action-button reject" onClick={() => handleUpdateUser(user.id, { status: "banned" })} type="button">
                    Ban
                  </button>
                ) : null}
                {user.status !== "active" ? (
                  <button className="action-button approve" onClick={() => handleUpdateUser(user.id, { status: "active" })} type="button">
                    Activate
                  </button>
                ) : null}
                <button
                  className="action-button neutral"
                  onClick={() => handleAssignCollege(user)}
                  type="button"
                >
                  Set College
                </button>
                {user.role === "student" && user.studentVerificationStatus !== "verified" ? (
                  <button
                    className="action-button approve"
                    onClick={() =>
                      handleUpdateUser(user.id, { studentVerificationStatus: "verified" })
                    }
                    type="button"
                  >
                    Verify Student
                  </button>
                ) : null}
                {user.role === "student" && user.studentVerificationStatus !== "rejected" ? (
                  <button
                    className="action-button reject"
                    onClick={() =>
                      handleUpdateUser(user.id, { studentVerificationStatus: "rejected" })
                    }
                    type="button"
                  >
                    Reject Verification
                  </button>
                ) : null}
              </div>
              {currentUser?.id === user.id ? (
                <p className="muted">This is your current admin account.</p>
              ) : null}
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Notice Workflow" description="Publish and manage notices with search support.">
        <NoticeForm
          formValue={noticeForm}
          onChange={(key, val) => setNoticeForm((current) => ({ ...current, [key]: val }))}
          onSubmit={handleSaveNotice}
          onCancel={() => { setEditingNoticeId(""); setNoticeForm(initialNoticeForm); }}
          isEditing={Boolean(editingNoticeId)}
          isDropdown={false}
        />

        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setNoticeSearch(event.target.value)}
            placeholder="Search title, college, or content..."
            type="text"
            value={noticeSearch}
          />
          <p className="muted">{filteredNotices.length} notices visible</p>
        </div>

        <div className="panel-list">
          {filteredNotices.map((notice) => (
            <article className="panel-card" key={notice._id}>
              <h3>{notice.title}</h3>
              <p className="muted">{notice.collegeName || "Global"} | {notice.isPublished ? "Published" : "Draft"}</p>
              <p>{notice.content}</p>
              <div className="panel-actions">
                <button
                  className="action-button approve"
                  onClick={() => {
                    setEditingNoticeId(notice._id);
                    setNoticeForm({
                      collegeName: notice.collegeName || "",
                      title: notice.title,
                      content: notice.content,
                      isPublished: notice.isPublished
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  type="button"
                >
                  Edit
                </button>
                <button className="action-button reject" onClick={() => handleDeleteNotice(notice._id)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!filteredNotices.length ? <p className="muted">No notices matched your search.</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Resource Moderation" description="Search, sort, edit metadata, or remove resources.">
        {editingResourceId ? (
          <form className="panel-form" onSubmit={handleSaveResource}>
            <label className="auth-field">
              <span>Title</span>
              <input
                onChange={(event) => setResourceEditForm((current) => ({ ...current, title: event.target.value }))}
                required
                type="text"
                value={resourceEditForm.title}
              />
            </label>
            <label className="auth-field">
              <span>Description</span>
              <textarea
                className="panel-textarea"
                onChange={(event) => setResourceEditForm((current) => ({ ...current, description: event.target.value }))}
                rows={2}
                value={resourceEditForm.description}
              />
            </label>
            <label className="auth-field">
              <span>Text Content</span>
              <textarea
                className="panel-textarea"
                onChange={(event) => setResourceEditForm((current) => ({ ...current, textContent: event.target.value }))}
                rows={3}
                value={resourceEditForm.textContent}
              />
            </label>
            <div className="panel-actions">
              <button className="auth-submit" type="submit">Save Resource</button>
              <button className="action-button neutral" onClick={() => { setEditingResourceId(""); setResourceEditForm(initialResourceEditForm); }} type="button">
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setResourceSearch(event.target.value)}
            placeholder="Search title, category, college, or subject..."
            type="text"
            value={resourceSearch}
          />
          <select className="college-search" onChange={(event) => setResourceSort(event.target.value)} value={resourceSort}>
            <option value="newest">Sort by newest</option>
            <option value="title-asc">Sort by title</option>
            <option value="category-asc">Sort by category</option>
          </select>
          <p className="muted">{filteredResources.length} resources visible</p>
        </div>

        <div className="panel-list">
          {filteredResources.map((resource) => (
            <article className="panel-card" key={resource._id}>
              <h3>{resource.title}</h3>
              <p className="muted">
                {resource.collegeName} | {resource.categoryId} | {resource.subjectId}
              </p>
              <p className="muted" style={{ marginBottom: "0.25rem" }}>Uploaded by: {resource.uploadedBy?.fullName || resource.uploadedBy?.email}</p>
              <p className="muted" style={{ marginBottom: "0.25rem" }}>Added: {new Date(resource.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <p className="muted">Access: {resource.visibility || "private"}</p>
              <div className="panel-actions">
                {!resource.fileUrl ? (
                  <button
                    className="action-button approve"
                    onClick={() => {
                      setEditingResourceId(resource._id);
                      setResourceEditForm({
                        title: resource.title || "",
                        description: resource.description || "",
                        textContent: resource.textContent || ""
                      });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                ) : null}
                <button className="action-button reject" onClick={() => handleDeleteResource(resource._id)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!filteredResources.length ? <p className="muted">No resources matched your search.</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Coverage Snapshot" description="Quick read on approved course and syllabus coverage.">
        <div className="detail-grid">
          <article className="detail-card">
            <h3>Approved Courses</h3>
            <p>{approvedCourses.length}</p>
          </article>
          <article className="detail-card">
            <h3>Syllabus Resources</h3>
            <p>{syllabusResources.length}</p>
          </article>
          <article className="detail-card">
            <h3>Academic Structures</h3>
            <p>{structures.length}</p>
          </article>
          <article className="detail-card">
            <h3>Subjects Managed</h3>
            <p>{subjects.length}</p>
          </article>
        </div>
      </SectionCard>
    </div>
  </div>
  );
}
