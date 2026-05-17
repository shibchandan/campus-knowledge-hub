import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { academicPrograms } from "../features/dashboard/data";
import { groupStructuresIntoPrograms } from "../lib/academicHelpers";
import { apiClient } from "../lib/apiClient";
import { requestDeletePassword } from "../lib/deleteWithPassword";
import { useToast } from "../ui/ToastContext";

function normalizeProgramKey(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const defaultSubjectCategories = [
  { id: "notice", label: "Notice" },
  { id: "syllabus", label: "Syllabus" },
  { id: "books", label: "Books" },
  { id: "class-notes", label: "Class Notes" },
  { id: "pdf-ppt", label: "PDF / PPT" },
  { id: "lecture", label: "Lecture" },
  { id: "lab", label: "Lab" },
  { id: "pyq", label: "PYQ" },
  { id: "suggestion", label: "Suggestion" }
];

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedCollege } = useCollege();
  const { showError, showSuccess } = useToast();
  const [programSearch, setProgramSearch] = useState("");
  const [noticeSearch, setNoticeSearch] = useState("");
  const [profile, setProfile] = useState(null);
  const [approvedCourses, setApprovedCourses] = useState([]);
  const [notices, setNotices] = useState([]);
  const [structures, setStructures] = useState([]);
  const [activeRepresentativeKey, setActiveRepresentativeKey] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [quickSubjectForm, setQuickSubjectForm] = useState({
    programId: "",
    branchId: "",
    semesterId: "",
    subjectName: "",
    subjectId: ""
  });
  const [quickCreateBusy, setQuickCreateBusy] = useState(false);
  const [quickCreateMessage, setQuickCreateMessage] = useState("");
  const [lastCreatedSubject, setLastCreatedSubject] = useState(null);
  const [courseForm, setCourseForm] = useState({ courseName: "" });
  const [courseBusy, setCourseBusy] = useState(false);

  async function reloadApprovedCourses() {
    if (!selectedCollege?.name) {
      setApprovedCourses([]);
      return;
    }

    try {
      const response = await apiClient.get("/governance/approved-courses");
      setApprovedCourses(
        (response.data.data || []).filter(
          (item) => item.collegeName?.toLowerCase() === selectedCollege.name.toLowerCase()
        )
      );
    } catch {
      setApprovedCourses([]);
    }
  }

  async function reloadStructures() {
    if (!selectedCollege?.name) {
      setStructures([]);
      return;
    }

    try {
      const response = await apiClient.get("/academic/structures", {
        params: { collegeName: selectedCollege.name }
      });
      setStructures(groupStructuresIntoPrograms(response.data.data));
    } catch {
      setStructures([]);
    }
  }

  useEffect(() => {
    async function loadCollegeProfile() {
      if (!selectedCollege?.name) {
        setProfile(null);
        setProfileError("");
        return;
      }

      setLoadingProfile(true);
      setProfileError("");

      try {
        const response = await apiClient.get("/governance/college-profile", {
          params: { collegeName: selectedCollege.name }
        });
        setProfile(response.data.data);
      } catch (requestError) {
        setProfileError(
          requestError.response?.data?.message || "Failed to load college details from server."
        );
      } finally {
        setLoadingProfile(false);
      }
    }

    loadCollegeProfile();
  }, [selectedCollege?.name]);

  useEffect(() => {
    if (!selectedCollege?.name) {
      setQuickSubjectForm({
        programId: "",
        branchId: "",
        semesterId: "",
        subjectName: "",
        subjectId: ""
      });
      setLastCreatedSubject(null);
      return;
    }

    const firstProgram = structures[0];
    const firstBranch = firstProgram?.branches?.[0];
    const firstSemester = firstBranch?.semesters?.[0];

    setQuickSubjectForm((current) => ({
      programId:
        current.programId && structures.some((program) => program.id === current.programId)
          ? current.programId
          : firstProgram?.id || "",
      branchId:
        current.branchId &&
        structures.some((program) =>
          program.branches.some((branch) => branch.id === current.branchId)
        )
          ? current.branchId
          : firstBranch?.id || "",
      semesterId:
        current.semesterId &&
        structures.some((program) =>
          program.branches.some((branch) =>
            branch.semesters.some((semester) => semester.id === current.semesterId)
          )
        )
          ? current.semesterId
          : firstSemester?.id || "",
      subjectName: current.subjectName || "",
      subjectId: current.subjectId || ""
    }));
  }, [selectedCollege?.name, structures]);

  useEffect(() => {
    async function loadApprovedCourses() {
      await reloadApprovedCourses();
    }

    loadApprovedCourses();
  }, [selectedCollege?.name]);

  useEffect(() => {
    async function loadNotices() {
      if (!selectedCollege?.name) {
        setNotices([]);
        return;
      }

      try {
        const response = await apiClient.get("/notices", {
          params: { collegeName: selectedCollege.name }
        });
        setNotices(response.data.data.slice(0, 5));
      } catch {
        setNotices([]);
      }
    }

    loadNotices();
  }, [selectedCollege?.name]);

  useEffect(() => {
    async function loadStructures() {
      await reloadStructures();
    }

    loadStructures();
  }, [selectedCollege?.name]);

  const programCards = useMemo(() => {
    if (structures.length) {
      return structures.map((program) => {
        const branchNames = program.branches.map((branch) => branch.name).filter(Boolean);
        const branchPreview = branchNames.slice(0, 3).join(", ");

        return {
          id: program.id,
          name: program.name,
          branch:
            branchPreview ||
            `${program.branches.length} database-managed branch${program.branches.length === 1 ? "" : "es"}`,
          description:
            branchNames.length > 3
              ? `+${branchNames.length - 3} more branches available inside this course.`
              : "Open this course to manage branch, semester, and subject flow."
        };
      });
    }

    if (approvedCourses.length) {
      const groupedPrograms = new Map();

      approvedCourses.forEach((course) => {
        const key = normalizeProgramKey(course.courseName);
        const existing = groupedPrograms.get(key) || {
          id: key,
          name: course.courseName,
          branchCount: 0,
          maxSemesters: 0
        };

        existing.branchCount += 1;
        existing.maxSemesters = Math.max(existing.maxSemesters, Number(course.semesterCount || 0));
        groupedPrograms.set(key, existing);
      });

      return Array.from(groupedPrograms.values())
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((program) => ({
          id: program.id,
          name: program.name,
          branch: `${program.branchCount} approved course entr${program.branchCount === 1 ? "y" : "ies"}`,
          description:
            program.maxSemesters > 0
              ? `Legacy course data includes up to ${program.maxSemesters} semesters. Branch structure can now be managed from the course page.`
              : "Approved course available. Branches will define their own semester count."
        }));
    }

    return academicPrograms;
  }, [approvedCourses, structures]);

  const filteredPrograms = useMemo(() => {
    const term = programSearch.trim().toLowerCase();

    if (!term) {
      return programCards;
    }

    return programCards.filter(
      (program) =>
        program.name.toLowerCase().includes(term) ||
        program.branch.toLowerCase().includes(term) ||
        program.description.toLowerCase().includes(term)
    );
  }, [programCards, programSearch]);

  const filteredNotices = useMemo(() => {
    const term = noticeSearch.trim().toLowerCase();

    if (!term) {
      return notices;
    }

    return notices.filter(
      (notice) =>
        notice.title.toLowerCase().includes(term) ||
        notice.content.toLowerCase().includes(term) ||
        (notice.collegeName || "platform-wide notice").toLowerCase().includes(term)
    );
  }, [noticeSearch, notices]);

  const representativeDirectory = useMemo(() => {
    const grouped = new Map();

    approvedCourses.forEach((course) => {
      const representative = course.addedByRepresentative;
      const key = representative?._id || course._id;
      const existing = grouped.get(key) || {
        key,
        fullName: representative?.fullName || "Representative",
        status: representative?.status || "active",
        courses: [],
        totalSemesters: 0
      };

      existing.courses.push({
        courseName: course.courseName,
        semesterCount: course.semesterCount
      });
      existing.totalSemesters += Number(course.semesterCount || 0);
      grouped.set(key, existing);
    });

    return Array.from(grouped.values()).sort((left, right) =>
      left.fullName.localeCompare(right.fullName)
    );
  }, [approvedCourses]);

  const canManageOverviewSubjects = user?.role === "admin" || user?.role === "representative";
  const selectedProgramStructure = useMemo(
    () => structures.find((program) => program.id === quickSubjectForm.programId) || null,
    [quickSubjectForm.programId, structures]
  );
  const selectedBranchStructure = useMemo(
    () =>
      selectedProgramStructure?.branches?.find((branch) => branch.id === quickSubjectForm.branchId) || null,
    [quickSubjectForm.branchId, selectedProgramStructure]
  );
  const selectedSemesterStructure = useMemo(
    () =>
      selectedBranchStructure?.semesters?.find((semester) => semester.id === quickSubjectForm.semesterId) ||
      null,
    [quickSubjectForm.semesterId, selectedBranchStructure]
  );

  useEffect(() => {
    if (!quickSubjectForm.subjectName) {
      return;
    }

    const nextSubjectId = slugify(quickSubjectForm.subjectName);
    setQuickSubjectForm((current) =>
      current.subjectId && current.subjectId !== slugify(current.subjectName)
        ? current
        : { ...current, subjectId: nextSubjectId }
    );
  }, [quickSubjectForm.subjectName]);

  async function handleQuickCreateSubject(event) {
    event.preventDefault();

    if (!selectedCollege?.name) {
      showError("Choose a college first.");
      return;
    }

    if (!selectedProgramStructure || !selectedBranchStructure || !selectedSemesterStructure) {
      showError("Create branch and semester structure first, then add subjects here.");
      return;
    }

    setQuickCreateBusy(true);
    setQuickCreateMessage("");

    try {
      const payload = {
        collegeName: selectedCollege.name,
        programId: quickSubjectForm.programId,
        branchId: quickSubjectForm.branchId,
        semesterId: quickSubjectForm.semesterId,
        subjectId: quickSubjectForm.subjectId || slugify(quickSubjectForm.subjectName),
        name: quickSubjectForm.subjectName
      };

      const response = await apiClient.post("/academic/subjects", payload);
      const createdSubject = response.data.data;
      setLastCreatedSubject(createdSubject);
      setQuickSubjectForm((current) => ({
        ...current,
        subjectName: "",
        subjectId: ""
      }));
      const message =
        "Subject created successfully. Notice, syllabus, books, class notes, PDF/PPT, lecture, lab, PYQ, and suggestion sections are now ready for this subject.";
      setQuickCreateMessage(message);
      showSuccess(message);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to create subject from overview.";
      setQuickCreateMessage(message);
      showError(message);
    } finally {
      setQuickCreateBusy(false);
    }
  }

  async function handleCreateCourse(event) {
    event.preventDefault();

    if (!selectedCollege?.name) {
      showError("Choose a college first.");
      return;
    }

    setCourseBusy(true);

    try {
      const payload = {
        collegeName: selectedCollege.name,
        courseName: courseForm.courseName
      };

      if (user?.role === "admin") {
        await apiClient.post("/governance/approved-courses", payload);
        showSuccess("Course added directly by admin.");
      } else {
        await apiClient.post("/governance/approved-courses", payload);
        showSuccess("Course added successfully.");
      }

      setCourseForm({ courseName: "" });
      await reloadApprovedCourses();
    } catch (requestError) {
      showError(requestError.response?.data?.message || "Failed to add course.");
    } finally {
      setCourseBusy(false);
    }
  }

  async function handleDeleteCourse(course) {
    const currentPassword = requestDeletePassword(
      `${course.courseName} from ${course.collegeName}`
    );
    if (!currentPassword) {
      return;
    }

    try {
      await apiClient.delete(`/governance/approved-courses/${course._id}`, {
        data: { currentPassword }
      });
      showSuccess("Course deleted successfully.");
      await Promise.all([reloadApprovedCourses(), reloadStructures()]);
    } catch (requestError) {
      showError(requestError.response?.data?.message || "Failed to delete course.");
    }
  }

  const dashboardStats = useMemo(
    () => [
      {
        label: "Departments",
        value: filteredPrograms.length,
        note: structures.length
          ? "Database-driven"
          : approvedCourses.length
            ? "Approved courses loaded"
            : "Starter overview"
      },
      {
        label: "Branches",
        value:
          structures.reduce((total, program) => total + program.branches.length, 0) ||
          (approvedCourses.length ? "Pending setup" : "Preset"),
        note: selectedCollege?.shortName || "Choose a college"
      },
      {
        label: "Published Notices",
        value: notices.length,
        note: selectedCollege?.name ? "Latest five shown" : "Select a college"
      },
      {
        label: "Profile Coverage",
        value: profile ? "Ready" : "Pending",
        note: profile ? "Details available" : "Representative can add details"
      }
    ],
    [
      approvedCourses.length,
      filteredPrograms.length,
      notices.length,
      profile,
      selectedCollege?.name,
      selectedCollege?.shortName,
      structures
    ]
  );

  return (
    <div className="page-stack">
      <SectionCard
        title="Overview Snapshot"
        description="A quick academic summary for the selected college before you drill into branches and semesters."
      >
        <div className="stat-grid">
          {dashboardStats.map((item) => (
            <article className="stat-card" key={item.label}>
              <p className="stat-label">{item.label}</p>
              <h3>{item.value}</h3>
              <p className="muted">{item.note}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="College Details"
        description="College representative entered profile visible on the academic dashboard."
      >
        {!selectedCollege ? <p className="muted">Select a college first from Colleges page.</p> : null}
        {loadingProfile ? <p className="muted">Loading college details...</p> : null}
        {profileError ? <p className="auth-error">{profileError}</p> : null}
        {!loadingProfile && selectedCollege && !profile ? (
          <p className="muted">
            No detail profile available for this college yet. Representative can add it from Panel.
          </p>
        ) : null}

        {profile ? (
          <div className="detail-grid">
            <article className="detail-card">
              <h3>College Name</h3>
              <p>{profile.collegeName}</p>
            </article>
            <article className="detail-card">
              <h3>Entrance Exams</h3>
              <p>{profile.entranceExams?.join(", ") || "Not provided"}</p>
            </article>
            <article className="detail-card">
              <h3>NIRF Ranking</h3>
              <p>{profile.rankings?.nirf || "Not provided"}</p>
            </article>
            <article className="detail-card">
              <h3>QS Ranking</h3>
              <p>{profile.rankings?.qs || "Not provided"}</p>
            </article>
            <article className="detail-card">
              <h3>Other Ranking</h3>
              <p>{profile.rankings?.other || "Not provided"}</p>
            </article>
            <article className="detail-card">
              <h3>Cut Off Summary</h3>
              <p>{profile.cutOffSummary || "Not provided"}</p>
            </article>
            <article className="detail-card">
              <h3>Placement Report</h3>
              <p>{profile.placementReport || "Not provided"}</p>
            </article>
            <article className="detail-card">
              <h3>Average Package</h3>
              <p>{profile.averagePackageLpa || "Not provided"}</p>
            </article>
            <article className="detail-card">
              <h3>Highest Package</h3>
              <p>{profile.highestPackageLpa || "Not provided"}</p>
            </article>
            <article className="detail-card">
              <h3>Report URL</h3>
              {profile.placementReportUrl ? (
                <a href={profile.placementReportUrl} rel="noreferrer" target="_blank">
                  Open placement report
                </a>
              ) : (
                <p>Not provided</p>
              )}
            </article>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Representative Directory"
        description="See who manages courses for this selected college and open their handled course list."
      >
        {!selectedCollege ? <p className="muted">Select a college first from Colleges page.</p> : null}
        {selectedCollege && !representativeDirectory.length ? (
          <p className="muted">No approved representatives are mapped to this college yet.</p>
        ) : null}
        <div className="panel-list">
          {representativeDirectory.map((representative) => (
            <article className="panel-card" key={representative.key}>
              <h3>{representative.fullName}</h3>
              <p className="muted">
                Manages {representative.courses.length} course entries | Total semesters covered:{" "}
                {representative.totalSemesters || "Branch-defined"}
              </p>
              <div className="panel-actions">
                <button
                  className="action-button neutral"
                  onClick={() =>
                    setActiveRepresentativeKey((current) =>
                      current === representative.key ? "" : representative.key
                    )
                  }
                  type="button"
                >
                  {activeRepresentativeKey === representative.key ? "Hide Details" : "View Managed Courses"}
                </button>
              </div>
              {activeRepresentativeKey === representative.key ? (
                <div className="detail-grid">
                  {representative.courses.map((course) => (
                    <article
                      className="detail-card"
                      key={`${representative.key}-${course.courseName}-${course.semesterCount || "branch-defined"}`}
                    >
                      <h3>{course.courseName}</h3>
                      <p>{course.semesterCount ? `${course.semesterCount} semesters` : "Semester count is branch-defined"}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Academic Dashboard"
        description="Choose a department to open its semester-wise subject page."
      >
        {structures.length ? (
          <p className="muted">Database-managed academic structure is active for this college.</p>
        ) : approvedCourses.length ? (
          <p className="muted">
            Approved courses are available for this college. Representatives can now open the course page and add branches with their own semester count.
          </p>
        ) : null}
        <div className="list-toolbar">
          <input
            className="college-search"
            onChange={(event) => setProgramSearch(event.target.value)}
            placeholder="Search department, branch count, or description..."
            type="text"
            value={programSearch}
          />
          <p className="muted">{filteredPrograms.length} departments visible</p>
        </div>
        <div className="program-grid">
          {filteredPrograms.map((program) => (
            <Link className="program-card program-link" key={program.id} to={`/dashboard/${program.id}`}>
              <p className="program-badge">{program.name}</p>
              <h3>{program.branch}</h3>
              <p className="muted">{program.description}</p>
            </Link>
          ))}
        </div>
      </SectionCard>

      {canManageOverviewSubjects ? (
        <SectionCard
          title="Course Manager"
          description="Add a course for this college first. Then open the course page to add branches, semesters, and subjects."
        >
          {!selectedCollege ? <p className="muted">Choose a college first from Colleges page.</p> : null}
          {selectedCollege ? (
            <form className="panel-form" onSubmit={handleCreateCourse}>
              <div className="panel-form-grid">
                <label className="auth-field">
                  <span>College Name</span>
                  <input readOnly type="text" value={selectedCollege.name} />
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
              </div>
              <div className="panel-actions">
                <button className="open-college-button" disabled={courseBusy} type="submit">
                  {courseBusy
                    ? "Saving Course..."
                    : user?.role === "admin"
                      ? "Add Course Directly"
                      : "Add Course"}
                </button>
              </div>
            </form>
          ) : null}
          <div className="detail-grid">
            {approvedCourses.map((course) => (
              <article className="detail-card" key={course._id}>
                <h3>{course.courseName}</h3>
                <p>{course.semesterCount ? `${course.semesterCount} legacy semesters` : "Semester count will be created branch-wise"}</p>
                <div className="panel-actions">
                  <Link
                    className="notes-focus-chip"
                    to={`/dashboard/${normalizeProgramKey(course.courseName)}`}
                  >
                    Open Course Page
                  </Link>
                  <button
                    className="action-button reject"
                    onClick={() => handleDeleteCourse(course)}
                    type="button"
                  >
                    Delete Course
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {canManageOverviewSubjects ? (
        <SectionCard
          title="Quick Subject Creator"
          description="After branch and semester are created from Panel, you can add subjects directly from the overview page."
        >
          {!selectedCollege ? <p className="muted">Choose a college first.</p> : null}
          {selectedCollege && !structures.length ? (
            <p className="muted">
              No branch-semester structure is available yet for this college. Create the academic structure from Panel first.
            </p>
          ) : null}
          {selectedCollege && structures.length ? (
            <form className="panel-form" onSubmit={handleQuickCreateSubject}>
              <div className="panel-form-grid">
                <label className="auth-field">
                  <span>Program</span>
                  <select
                    onChange={(event) =>
                      setQuickSubjectForm({
                        programId: event.target.value,
                        branchId:
                          structures.find((program) => program.id === event.target.value)?.branches?.[0]?.id || "",
                        semesterId:
                          structures
                            .find((program) => program.id === event.target.value)
                            ?.branches?.[0]?.semesters?.[0]?.id || "",
                        subjectName: quickSubjectForm.subjectName,
                        subjectId: quickSubjectForm.subjectId
                      })
                    }
                    value={quickSubjectForm.programId}
                  >
                    <option value="">Select program</option>
                    {structures.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="auth-field">
                  <span>Branch</span>
                  <select
                    onChange={(event) =>
                      setQuickSubjectForm((current) => ({
                        ...current,
                        branchId: event.target.value,
                        semesterId:
                          selectedProgramStructure?.branches?.find((branch) => branch.id === event.target.value)
                            ?.semesters?.[0]?.id || ""
                      }))
                    }
                    value={quickSubjectForm.branchId}
                  >
                    <option value="">Select branch</option>
                    {selectedProgramStructure?.branches?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="auth-field">
                  <span>Semester</span>
                  <select
                    onChange={(event) =>
                      setQuickSubjectForm((current) => ({ ...current, semesterId: event.target.value }))
                    }
                    value={quickSubjectForm.semesterId}
                  >
                    <option value="">Select semester</option>
                    {selectedBranchStructure?.semesters?.map((semester) => (
                      <option key={semester.id} value={semester.id}>
                        {semester.semester}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="auth-field">
                  <span>Subject Name</span>
                  <input
                    onChange={(event) =>
                      setQuickSubjectForm((current) => ({ ...current, subjectName: event.target.value }))
                    }
                    placeholder="Mathematics-I"
                    required
                    type="text"
                    value={quickSubjectForm.subjectName}
                  />
                </label>
                <label className="auth-field">
                  <span>Subject ID</span>
                  <input
                    onChange={(event) =>
                      setQuickSubjectForm((current) => ({ ...current, subjectId: event.target.value }))
                    }
                    placeholder="mathematics-1"
                    type="text"
                    value={quickSubjectForm.subjectId}
                  />
                </label>
              </div>
              <div className="panel-actions">
                <button className="open-college-button" disabled={quickCreateBusy} type="submit">
                  {quickCreateBusy ? "Creating Subject..." : "Create Subject From Overview"}
                </button>
              </div>
            </form>
          ) : null}
          {quickCreateMessage ? (
            <p className={lastCreatedSubject ? "muted" : "auth-error"}>{quickCreateMessage}</p>
          ) : null}
          {lastCreatedSubject && selectedProgramStructure && selectedBranchStructure && selectedSemesterStructure ? (
            <div className="detail-grid">
              <article className="detail-card">
                <h3>{lastCreatedSubject.name}</h3>
                <p>
                  {selectedProgramStructure.name} | {selectedBranchStructure.name} | {selectedSemesterStructure.semester}
                </p>
                <p className="muted">The resource sections below are available automatically for this subject.</p>
                <div className="notes-focus-wrap">
                  {defaultSubjectCategories.map((category) => (
                    <Link
                      className="notes-focus-chip"
                      key={category.id}
                      to={`/dashboard/${selectedProgramStructure.id}/branch/${selectedBranchStructure.id}/${selectedSemesterStructure.id}/${lastCreatedSubject.subjectId}/${category.id}`}
                    >
                      {category.label}
                    </Link>
                  ))}
                </div>
              </article>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard
        title="Latest Notices"
        description="Published notices for the selected college and platform-wide announcements."
      >
        {!selectedCollege ? <p className="muted">Select a college to see its notices.</p> : null}
        <div className="list-toolbar">
          <input
            className="college-search"
            onChange={(event) => setNoticeSearch(event.target.value)}
            placeholder="Search notice title or content..."
            type="text"
            value={noticeSearch}
          />
          <p className="muted">{filteredNotices.length} notices visible</p>
        </div>
        {selectedCollege && notices.length === 0 ? (
          <p className="muted">No notices published for this college yet.</p>
        ) : null}
        <div className="panel-list">
          {filteredNotices.map((notice) => (
            <article className="panel-card" key={notice._id}>
              <h3>{notice.title}</h3>
              <p className="muted">{notice.collegeName || "Platform-wide notice"}</p>
              <p>{notice.content}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
