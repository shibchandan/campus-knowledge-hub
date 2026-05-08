import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { SectionCard } from "../components/SectionCard";
import { apiClient, buildAuthorizedApiUrl } from "../lib/apiClient";
import { useToast } from "../ui/ToastContext";

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
  courseName: "",
  semesterCount: 8
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
  const [approvedCourses, setApprovedCourses] = useState([]);
  const [notices, setNotices] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [structures, setStructures] = useState([]);
  const [resources, setResources] = useState([]);
  const [syllabusResources, setSyllabusResources] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
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

  async function loadAdminData() {
    setLoading(true);
    setError("");

    try {
      const [
        pendingResponse,
        usersResponse,
        approvedResponse,
        noticesResponse,
        structuresResponse,
        subjectsResponse,
        resourcesResponse,
        syllabusResponse,
        auditResponse
      ] = await Promise.all([
        apiClient.get("/governance/requests/pending"),
        apiClient.get("/auth/admin/users"),
        apiClient.get("/governance/approved-courses"),
        apiClient.get("/notices", { params: { includeUnpublished: true } }),
        apiClient.get("/academic/structures"),
        apiClient.get("/academic/subjects"),
        apiClient.get("/resources", { params: { page: 1, limit: 50 } }),
        apiClient.get("/resources", { params: { page: 1, limit: 20, categoryId: "syllabus" } }),
        apiClient.get("/audit/logs", { params: { page: 1, limit: 20 } })
      ]);

      setPendingRequests(pendingResponse.data.data || []);
      setUsers(usersResponse.data.data || []);
      setApprovedCourses(approvedResponse.data.data || []);
      setNotices(noticesResponse.data.data || []);
      setStructures(structuresResponse.data.data || []);
      setSubjects(subjectsResponse.data.data || []);
      setResources(resourcesResponse.data.data?.items || []);
      setSyllabusResources(syllabusResponse.data.data?.items || []);
      setAuditLogs(auditResponse.data.data?.items || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load admin control data.");
    } finally {
      setLoading(false);
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
        ...courseForm,
        semesterCount: Number(courseForm.semesterCount)
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
      courseName: course.courseName || "",
      semesterCount: Number(course.semesterCount || 8)
    });
    clearMessages();
  }

  async function handleDeleteCourse(courseId) {
    clearMessages();
    try {
      await apiClient.delete(`/governance/approved-courses/${courseId}`);
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
    clearMessages();
  }

  async function handleDeleteStructure(structureId) {
    clearMessages();
    try {
      await apiClient.delete(`/academic/structures/${structureId}`);
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
    clearMessages();
  }

  async function handleDeleteSubject(subjectId) {
    clearMessages();
    try {
      await apiClient.delete(`/academic/subjects/${subjectId}`);
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
    clearMessages();
    try {
      await apiClient.delete(`/notices/${noticeId}`);
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
    clearMessages();
    try {
      await apiClient.delete(`/resources/${resourceId}`);
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
      { label: "Pending Requests", value: pendingRequests.length, note: "Needs admin review" },
      { label: "Total Users", value: users.length, note: "All account roles" },
      { label: "Active Users", value: users.filter((user) => user.status === "active").length, note: "Currently allowed access" },
      { label: "Approved Colleges", value: approvedCourses.length, note: "Available to students" },
      { label: "Published Notices", value: notices.filter((notice) => notice.isPublished).length, note: "Live announcements" },
      { label: "Managed Resources", value: resources.length, note: "Current moderation list" }
    ],
    [approvedCourses.length, notices, pendingRequests.length, resources.length, users]
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
    <div className="page-stack">
      <SectionCard
        title="Admin Control Center"
        description="Central oversight for requests, users, notices, resources, and audit visibility."
      >
        {error ? <p className="auth-error">{error}</p> : null}
        {success ? <p className="success-note">{success}</p> : null}
        {loading ? <p className="muted">Loading admin control data...</p> : null}
        <div className="stat-grid">
          {metrics.map((metric) => (
            <article className="stat-card" key={metric.label}>
              <p className="stat-label">{metric.label}</p>
              <h3>{metric.value}</h3>
              <p className="muted">{metric.note}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Recent Audit Activity" description="Search sensitive actions and who performed them.">
        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setAuditSearch(event.target.value)}
            placeholder="Search action, entity, or actor..."
            type="text"
            value={auditSearch}
          />
          <p className="muted">{filteredAuditLogs.length} records visible</p>
        </div>
        <div className="panel-list">
          {filteredAuditLogs.map((log) => (
            <article className="panel-card" key={log._id}>
              <h3>{log.action}</h3>
              <p className="muted">
                {log.entityType} | {log.actorUserId?.fullName || log.actorUserId?.email || "System"}
              </p>
              <p className="muted">{new Date(log.createdAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Representative Requests" description="Approve or reject pending submissions quickly.">
        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setRequestSearch(event.target.value)}
            placeholder="Search college, course, or representative..."
            type="text"
            value={requestSearch}
          />
          <p className="muted">{filteredRequests.length} pending requests</p>
        </div>
        <div className="panel-list">
          {filteredRequests.map((request) => (
            <article className="panel-card" key={request._id}>
              <h3>{request.collegeName}</h3>
              <p className="muted">Course: {request.courseName} | Semesters: {request.semesterCount}</p>
              <p className="muted">
                Representative: {request.representative?.fullName} ({request.representative?.email})
              </p>
              <div className="panel-actions">
                <button className="action-button approve" onClick={() => handleDecision(request._id, "approve")} type="button">
                  Approve
                </button>
                <button className="action-button reject" onClick={() => handleDecision(request._id, "reject")} type="button">
                  Reject
                </button>
              </div>
            </article>
          ))}
          {!filteredRequests.length ? <p className="muted">No matching requests.</p> : null}
        </div>
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
                <p className="muted">Course: {course.courseName} | Semesters: {course.semesterCount}</p>
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
        <form className="panel-form" onSubmit={handleSaveCourse}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>College Name</span>
              <input
                onChange={(event) =>
                  setCourseForm((current) => ({ ...current, collegeName: event.target.value }))
                }
                placeholder="Motilal Nehru National Institute of Technology, Prayagraj"
                required
                type="text"
                value={courseForm.collegeName}
              />
            </label>
            <label className="auth-field">
              <span>Course Name</span>
              <input
                onChange={(event) =>
                  setCourseForm((current) => ({ ...current, courseName: event.target.value }))
                }
                placeholder="BTech"
                required
                type="text"
                value={courseForm.courseName}
              />
            </label>
            <label className="auth-field">
              <span>Semester Count</span>
              <input
                max="12"
                min="1"
                onChange={(event) =>
                  setCourseForm((current) => ({ ...current, semesterCount: event.target.value }))
                }
                required
                type="number"
                value={courseForm.semesterCount}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button className="auth-submit" type="submit">
              {editingCourseId ? "Update Course" : "Create College Course"}
            </button>
            {editingCourseId ? (
              <button className="action-button neutral" onClick={resetCourseForm} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>

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
                {course.courseName} | {course.semesterCount} semesters
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
        <form className="panel-form" onSubmit={handleSaveStructure}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>College Name</span>
              <select
                onChange={(event) =>
                  setStructureForm((current) => ({
                    ...current,
                    collegeName: event.target.value,
                    programId: "",
                    programName: ""
                  }))
                }
                required
                value={structureForm.collegeName}
              >
                <option value="">Select college</option>
                {adminCollegeNames.map((collegeName) => (
                  <option key={collegeName} value={collegeName}>
                    {collegeName}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-field">
              <span>Program / Course</span>
              <select
                onChange={(event) =>
                  setStructureForm((current) => ({
                    ...current,
                    programId: event.target.value,
                    programName: event.target.value
                  }))
                }
                required
                value={structureForm.programId}
              >
                <option value="">Select course</option>
                {structureProgramsForCollege.map((courseName) => (
                  <option key={courseName} value={courseName}>
                    {courseName}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-field">
              <span>Branch ID</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, branchId: event.target.value }))
                }
                placeholder="computer-science-engineering"
                required
                type="text"
                value={structureForm.branchId}
              />
            </label>
            <label className="auth-field">
              <span>Branch Name</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, branchName: event.target.value }))
                }
                placeholder="Computer Science & Engineering"
                required
                type="text"
                value={structureForm.branchName}
              />
            </label>
            <label className="auth-field">
              <span>Semester ID</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, semesterId: event.target.value }))
                }
                placeholder="semester-1"
                required
                type="text"
                value={structureForm.semesterId}
              />
            </label>
            <label className="auth-field">
              <span>Semester Name</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, semesterName: event.target.value }))
                }
                placeholder="Semester 1"
                required
                type="text"
                value={structureForm.semesterName}
              />
            </label>
            <label className="auth-field">
              <span>Semester Order</span>
              <input
                max="20"
                min="1"
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, semesterOrder: event.target.value }))
                }
                required
                type="number"
                value={structureForm.semesterOrder}
              />
            </label>
            <label className="auth-field">
              <span>Branch Description</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, branchDescription: event.target.value }))
                }
                placeholder="Core branch structure for this college course"
                type="text"
                value={structureForm.branchDescription}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button className="auth-submit" type="submit">
              {editingStructureId ? "Update Structure" : "Create Structure"}
            </button>
            {editingStructureId ? (
              <button className="action-button neutral" onClick={resetStructureForm} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setStructureSearch(event.target.value)}
            placeholder="Search college, program, branch, or semester..."
            type="text"
            value={structureSearch}
          />
          <p className="muted">{filteredStructures.length} structures visible</p>
        </div>

        <div className="panel-list">
          {filteredStructures.map((structure) => (
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
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Subject Management"
        description="Admin can create semester-wise subjects for any approved college course."
      >
        <form className="panel-form" onSubmit={handleSaveSubject}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>College Name</span>
              <select
                onChange={(event) =>
                  setSubjectForm((current) => ({
                    ...current,
                    collegeName: event.target.value,
                    programId: ""
                  }))
                }
                required
                value={subjectForm.collegeName}
              >
                <option value="">Select college</option>
                {adminCollegeNames.map((collegeName) => (
                  <option key={collegeName} value={collegeName}>
                    {collegeName}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-field">
              <span>Program / Course</span>
              <select
                onChange={(event) =>
                  setSubjectForm((current) => ({ ...current, programId: event.target.value }))
                }
                required
                value={subjectForm.programId}
              >
                <option value="">Select course</option>
                {subjectProgramsForCollege.map((courseName) => (
                  <option key={courseName} value={courseName}>
                    {courseName}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-field">
              <span>Branch ID</span>
              <input
                onChange={(event) =>
                  setSubjectForm((current) => ({ ...current, branchId: event.target.value }))
                }
                placeholder="computer-science-engineering"
                required
                type="text"
                value={subjectForm.branchId}
              />
            </label>
            <label className="auth-field">
              <span>Semester ID</span>
              <input
                onChange={(event) =>
                  setSubjectForm((current) => ({ ...current, semesterId: event.target.value }))
                }
                placeholder="semester-1"
                required
                type="text"
                value={subjectForm.semesterId}
              />
            </label>
            <label className="auth-field">
              <span>Subject ID</span>
              <input
                onChange={(event) =>
                  setSubjectForm((current) => ({ ...current, subjectId: event.target.value }))
                }
                placeholder="mathematics-1"
                type="text"
                value={subjectForm.subjectId}
              />
            </label>
            <label className="auth-field">
              <span>Subject Name</span>
              <input
                onChange={(event) =>
                  setSubjectForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Mathematics-I"
                required
                type="text"
                value={subjectForm.name}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button className="auth-submit" type="submit">
              {editingSubjectId ? "Update Subject" : "Create Subject"}
            </button>
            {editingSubjectId ? (
              <button className="action-button neutral" onClick={resetSubjectForm} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>

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
              <p className="muted">Assigned college: {user.collegeName || "Not assigned"}</p>
              <p className="muted">College ID: {user.collegeStudentId || "Not added"}</p>
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
        <form className="panel-form" onSubmit={handleSaveNotice}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>College Name (optional)</span>
              <input
                onChange={(event) => setNoticeForm((current) => ({ ...current, collegeName: event.target.value }))}
                type="text"
                value={noticeForm.collegeName}
              />
            </label>
            <label className="auth-field">
              <span>Title</span>
              <input
                onChange={(event) => setNoticeForm((current) => ({ ...current, title: event.target.value }))}
                required
                type="text"
                value={noticeForm.title}
              />
            </label>
            <label className="auth-field">
              <span>Status</span>
              <select
                onChange={(event) =>
                  setNoticeForm((current) => ({ ...current, isPublished: event.target.value === "published" }))
                }
                value={noticeForm.isPublished ? "published" : "draft"}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>
          <label className="auth-field">
            <span>Content</span>
            <textarea
              className="panel-textarea"
              onChange={(event) => setNoticeForm((current) => ({ ...current, content: event.target.value }))}
              required
              rows={3}
              value={noticeForm.content}
            />
          </label>
          <div className="panel-actions">
            <button className="auth-submit" type="submit">
              {editingNoticeId ? "Update Notice" : "Create Notice"}
            </button>
            {editingNoticeId ? (
              <button className="action-button neutral" onClick={() => { setEditingNoticeId(""); setNoticeForm(initialNoticeForm); }} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>

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
              <p className="muted">Uploaded by: {resource.uploadedBy?.fullName || resource.uploadedBy?.email}</p>
              <div className="panel-actions">
                <button
                  className="action-button approve"
                  onClick={() => {
                    setEditingResourceId(resource._id);
                    setResourceEditForm({
                      title: resource.title || "",
                      description: resource.description || "",
                      textContent: resource.textContent || ""
                    });
                  }}
                  type="button"
                >
                  Edit
                </button>
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
  );
}
