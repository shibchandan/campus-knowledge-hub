import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";

const initialForm = {
  collegeName: "",
  courseName: "",
  semesterCount: 8
};

const initialProfileForm = {
  collegeName: "",
  entranceExams: "",
  nirf: "",
  qs: "",
  otherRanking: "",
  cutOffSummary: "",
  placementReport: "",
  placementReportUrl: "",
  averagePackageLpa: "",
  highestPackageLpa: ""
};

function mapProfileToForm(profile) {
  if (!profile) {
    return initialProfileForm;
  }

  return {
    collegeName: profile.collegeName || "",
    entranceExams: Array.isArray(profile.entranceExams) ? profile.entranceExams.join(", ") : "",
    nirf: profile.rankings?.nirf || "",
    qs: profile.rankings?.qs || "",
    otherRanking: profile.rankings?.other || "",
    cutOffSummary: profile.cutOffSummary || "",
    placementReport: profile.placementReport || "",
    placementReportUrl: profile.placementReportUrl || "",
    averagePackageLpa: profile.averagePackageLpa || "",
    highestPackageLpa: profile.highestPackageLpa || ""
  };
}

export function RepresentativePanelPage() {
  const [form, setForm] = useState(initialForm);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [requests, setRequests] = useState([]);
  const [myColleges, setMyColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState("");
  const [editingProfileId, setEditingProfileId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [collegeSearch, setCollegeSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState("all");
  const [collegeSort, setCollegeSort] = useState("college-asc");

  async function loadRepresentativeData() {
    setLoading(true);
    setError("");

    try {
      const [requestsResponse, collegesResponse] = await Promise.all([
        apiClient.get("/governance/requests/my"),
        apiClient.get("/governance/approved-courses/my")
      ]);

      setRequests(requestsResponse.data.data);
      setMyColleges(collegesResponse.data.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Failed to load your representative data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRepresentativeData();
  }, []);

  function resetCourseForm() {
    setForm(initialForm);
    setEditingCourseId("");
  }

  function resetProfileForm() {
    setProfileForm(initialProfileForm);
    setEditingProfileId("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        semesterCount: Number(form.semesterCount)
      };

      if (editingCourseId) {
        await apiClient.patch(`/governance/approved-courses/${editingCourseId}`, payload);
        setSuccess("College course details updated successfully.");
      } else {
        await apiClient.post("/governance/requests", payload);
        setSuccess("Request submitted for admin verification.");
      }

      resetCourseForm();
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save college course details.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await apiClient.put("/governance/college-profile", {
        collegeName: profileForm.collegeName,
        entranceExams: profileForm.entranceExams,
        rankings: {
          nirf: profileForm.nirf,
          qs: profileForm.qs,
          other: profileForm.otherRanking
        },
        cutOffSummary: profileForm.cutOffSummary,
        placementReport: profileForm.placementReport,
        placementReportUrl: profileForm.placementReportUrl,
        averagePackageLpa: profileForm.averagePackageLpa,
        highestPackageLpa: profileForm.highestPackageLpa
      });

      setSuccess(editingProfileId ? "College profile updated successfully." : "College profile saved successfully.");
      resetProfileForm();
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save college profile.");
    } finally {
      setProfileSubmitting(false);
    }
  }

  function handleEditCourse(course) {
    setError("");
    setSuccess("");
    setEditingCourseId(course._id);
    setForm({
      collegeName: course.collegeName,
      courseName: course.courseName,
      semesterCount: course.semesterCount
    });
  }

  function handleEditProfile(profile) {
    setError("");
    setSuccess("");
    setEditingProfileId(profile._id);
    setProfileForm(mapProfileToForm(profile));
  }

  async function handleDeleteCourse(course) {
    const shouldDelete = window.confirm(
      `Delete ${course.courseName} from ${course.collegeName}? This will remove the approved college-course entry from your account.`
    );

    if (!shouldDelete) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiClient.delete(`/governance/approved-courses/${course._id}`);
      if (editingCourseId === course._id) {
        resetCourseForm();
      }
      if (editingProfileId && course.profile?._id === editingProfileId) {
        resetProfileForm();
      }
      setSuccess(response.data.message || "College course deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete college course.");
    }
  }

  async function handleDeleteProfile(profile) {
    const shouldDelete = window.confirm(`Delete the profile details for ${profile.collegeName}?`);

    if (!shouldDelete) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiClient.delete(`/governance/college-profile/${profile._id}`);
      if (editingProfileId === profile._id) {
        resetProfileForm();
      }
      setSuccess(response.data.message || "College profile deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete college profile.");
    }
  }

  const filteredColleges = useMemo(() => {
    const term = collegeSearch.trim().toLowerCase();
    const items = myColleges.filter((item) => {
      if (!term) {
        return true;
      }

      return (
        item.collegeName.toLowerCase().includes(term) ||
        item.courseName.toLowerCase().includes(term) ||
        (item.profile?.entranceExams || []).join(", ").toLowerCase().includes(term)
      );
    });

    items.sort((left, right) => {
      if (collegeSort === "semester-desc") {
        return right.semesterCount - left.semesterCount;
      }

      if (collegeSort === "course-asc") {
        return left.courseName.localeCompare(right.courseName);
      }

      return left.collegeName.localeCompare(right.collegeName);
    });

    return items;
  }, [collegeSearch, collegeSort, myColleges]);

  const filteredRequests = useMemo(() => {
    const term = requestSearch.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesFilter = requestFilter === "all" ? true : request.status === requestFilter;
      const matchesSearch =
        !term ||
        request.collegeName.toLowerCase().includes(term) ||
        request.courseName.toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [requestFilter, requestSearch, requests]);

  const stats = useMemo(
    () => [
      {
        label: "Approved Colleges",
        value: myColleges.length,
        note: "Editable from this panel"
      },
      {
        label: "Pending Requests",
        value: requests.filter((request) => request.status === "pending").length,
        note: "Awaiting admin decision"
      },
      {
        label: "Profiles Added",
        value: myColleges.filter((item) => item.profile).length,
        note: "Visible on dashboard"
      },
      {
        label: "Visible Search Results",
        value: filteredColleges.length,
        note: "Based on your current filter"
      }
    ],
    [filteredColleges.length, myColleges, requests]
  );

  return (
    <div className="page-stack">
      <SectionCard
        title="Representative Panel"
        description="Submit new college-course requests and manage only the colleges approved under your account."
      >
        {error ? <p className="auth-error">{error}</p> : null}
        {success ? <p className="success-note">{success}</p> : null}
        <div className="stat-grid">
          {stats.map((item) => (
            <article className="stat-card" key={item.label}>
              <p className="stat-label">{item.label}</p>
              <h3>{item.value}</h3>
              <p className="muted">{item.note}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="College Request Form"
        description="Create a new approval request or update one of your approved course entries."
      >
        <form className="panel-form" onSubmit={handleSubmit}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>College Name</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, collegeName: event.target.value }))}
                required
                type="text"
                value={form.collegeName}
              />
            </label>
            <label className="auth-field">
              <span>Course Name</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, courseName: event.target.value }))}
                required
                type="text"
                value={form.courseName}
              />
            </label>
            <label className="auth-field">
              <span>Semester Count</span>
              <input
                max="12"
                min="1"
                onChange={(event) =>
                  setForm((current) => ({ ...current, semesterCount: event.target.value }))
                }
                required
                type="number"
                value={form.semesterCount}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button className="auth-submit" disabled={submitting} type="submit">
              {submitting
                ? editingCourseId
                  ? "Updating..."
                  : "Submitting..."
                : editingCourseId
                  ? "Update College Course"
                  : "Submit For Approval"}
            </button>
            {editingCourseId ? (
              <button className="action-button neutral" onClick={resetCourseForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="College Detail Entry"
        description="Add exam, ranking, cut-off, and placement details for your own approved colleges."
      >
        <form className="panel-form" onSubmit={handleProfileSubmit}>
          <label className="auth-field">
            <span>College Name</span>
            <input
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, collegeName: event.target.value }))
              }
              placeholder="Exact approved college name"
              required
              type="text"
              value={profileForm.collegeName}
            />
          </label>
          <label className="auth-field">
            <span>Entrance Exams (comma separated)</span>
            <input
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, entranceExams: event.target.value }))
              }
              placeholder="JEE Main, GATE, CAT"
              type="text"
              value={profileForm.entranceExams}
            />
          </label>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>NIRF Ranking</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, nirf: event.target.value }))
                }
                type="text"
                value={profileForm.nirf}
              />
            </label>
            <label className="auth-field">
              <span>QS Ranking</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, qs: event.target.value }))
                }
                type="text"
                value={profileForm.qs}
              />
            </label>
            <label className="auth-field">
              <span>Other Ranking</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, otherRanking: event.target.value }))
                }
                type="text"
                value={profileForm.otherRanking}
              />
            </label>
          </div>
          <label className="auth-field">
            <span>Cut Off Summary</span>
            <textarea
              className="panel-textarea"
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, cutOffSummary: event.target.value }))
              }
              rows={3}
              value={profileForm.cutOffSummary}
            />
          </label>
          <label className="auth-field">
            <span>Placement Report Summary</span>
            <textarea
              className="panel-textarea"
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, placementReport: event.target.value }))
              }
              rows={3}
              value={profileForm.placementReport}
            />
          </label>
          <label className="auth-field">
            <span>Placement Report URL</span>
            <input
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, placementReportUrl: event.target.value }))
              }
              type="url"
              value={profileForm.placementReportUrl}
            />
          </label>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>Average Package (LPA)</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    averagePackageLpa: event.target.value
                  }))
                }
                type="text"
                value={profileForm.averagePackageLpa}
              />
            </label>
            <label className="auth-field">
              <span>Highest Package (LPA)</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    highestPackageLpa: event.target.value
                  }))
                }
                type="text"
                value={profileForm.highestPackageLpa}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button className="auth-submit" disabled={profileSubmitting} type="submit">
              {profileSubmitting
                ? "Saving..."
                : editingProfileId
                  ? "Update College Details"
                  : "Save College Details"}
            </button>
            {editingProfileId ? (
              <button className="action-button neutral" onClick={resetProfileForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="My Approved Colleges"
        description="Search, sort, and manage only the college records assigned to your account."
      >
        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setCollegeSearch(event.target.value)}
            placeholder="Search your college, course, or exam details..."
            type="text"
            value={collegeSearch}
          />
          <select
            className="college-search"
            onChange={(event) => setCollegeSort(event.target.value)}
            value={collegeSort}
          >
            <option value="college-asc">Sort by college</option>
            <option value="course-asc">Sort by course</option>
            <option value="semester-desc">Sort by semester count</option>
          </select>
        </div>
        {loading ? <p className="muted">Loading your approved colleges...</p> : null}
        {!loading && filteredColleges.length === 0 ? (
          <p className="muted">No approved colleges assigned to your account yet.</p>
        ) : null}
        <div className="panel-list">
          {filteredColleges.map((item) => (
            <article className="panel-card" key={item._id}>
              <h3>{item.collegeName}</h3>
              <p className="muted">
                Course: {item.courseName} | Semesters: {item.semesterCount}
              </p>
              <p className="muted">
                Approved by: {item.approvedByAdmin?.fullName || "Admin"}
              </p>
              <div className="panel-actions">
                <button className="action-button approve" onClick={() => handleEditCourse(item)} type="button">
                  Edit Course
                </button>
                <button className="action-button reject" onClick={() => handleDeleteCourse(item)} type="button">
                  Delete Course
                </button>
              </div>
              {item.profile ? (
                <div className="panel-subsection">
                  <p className="muted">
                    Exams: {item.profile.entranceExams?.length ? item.profile.entranceExams.join(", ") : "Not added"}
                  </p>
                  <p className="muted">
                    Rankings: NIRF {item.profile.rankings?.nirf || "-"} | QS {item.profile.rankings?.qs || "-"} | Other {item.profile.rankings?.other || "-"}
                  </p>
                  <div className="panel-actions">
                    <button
                      className="action-button approve"
                      onClick={() => handleEditProfile(item.profile)}
                      type="button"
                    >
                      Edit Profile
                    </button>
                    <button
                      className="action-button reject"
                      onClick={() => handleDeleteProfile(item.profile)}
                      type="button"
                    >
                      Delete Profile
                    </button>
                  </div>
                </div>
              ) : (
                <div className="panel-subsection">
                  <p className="muted">No profile details added yet for this college.</p>
                  <button
                    className="action-button approve"
                    onClick={() =>
                      setProfileForm((current) => ({ ...current, collegeName: item.collegeName }))
                    }
                    type="button"
                  >
                    Add Profile Details
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="My Requests" description="Track approval status with search and status filters.">
        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setRequestSearch(event.target.value)}
            placeholder="Search request by college or course..."
            type="text"
            value={requestSearch}
          />
          <select
            className="college-search"
            onChange={(event) => setRequestFilter(event.target.value)}
            value={requestFilter}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        {loading ? <p className="muted">Loading requests...</p> : null}
        {!loading && filteredRequests.length === 0 ? (
          <p className="muted">You have not submitted any matching requests yet.</p>
        ) : null}
        <div className="panel-list">
          {filteredRequests.map((request) => (
            <article className="panel-card" key={request._id}>
              <h3>{request.collegeName}</h3>
              <p className="muted">
                Course: {request.courseName} | Semesters: {request.semesterCount}
              </p>
              <p className={`status-chip ${request.status}`}>Status: {request.status}</p>
              {request.decisionNote ? <p className="muted">Note: {request.decisionNote}</p> : null}
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
