import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";
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
  const [resourceEditForm, setResourceEditForm] = useState(initialResourceEditForm);
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
                  <a href={user.studentProofUrl} rel="noreferrer" target="_blank">
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
