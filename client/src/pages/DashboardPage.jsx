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
  { id: "suggestion", label: "Suggestion" },
  { id: "assignment", label: "Assignment" },
  { id: "project", label: "Project" },
  { id: "extra-resource", label: "Extra Resource" }
];

export function DashboardPage() {
  const { user, refreshCurrentUser } = useAuth();
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
  const [activeTab, setActiveTab] = useState("workspace");
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

  const totalBranches = useMemo(
    () => structures.reduce((total, program) => total + program.branches.length, 0),
    [structures]
  );

  const totalSemesters = useMemo(
    () =>
      structures.reduce(
        (total, program) =>
          total +
          program.branches.reduce((branchTotal, branch) => branchTotal + branch.semesters.length, 0),
        0
      ),
    [structures]
  );

  const totalSubjects = useMemo(
    () =>
      structures.reduce(
        (total, program) =>
          total +
          program.branches.reduce(
            (branchTotal, branch) =>
              branchTotal +
              branch.semesters.reduce(
                (semesterTotal, semester) => semesterTotal + semester.subjects.length,
                0
              ),
            0
          ),
        0
      ),
    [structures]
  );

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
        await apiClient.post("/governance/requests", payload);
        showSuccess("College course request submitted to admin for approval.");
      }

      setCourseForm({ courseName: "" });
      await Promise.all([reloadApprovedCourses(), refreshCurrentUser()]);
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
      await Promise.all([reloadApprovedCourses(), reloadStructures(), refreshCurrentUser()]);
    } catch (requestError) {
      showError(requestError.response?.data?.message || "Failed to delete course.");
    }
  }

  const dashboardStats = useMemo(
    () => [
      {
        label: "Programs",
        value: programCards.length,
        note: structures.length
          ? "Database-driven"
          : approvedCourses.length
            ? "Approved courses loaded"
            : "Starter overview"
      },
      {
        label: "Branches",
        value: totalBranches || (approvedCourses.length ? "Pending setup" : "Preset"),
        note: selectedCollege?.shortName || "Choose a college"
      },
      {
        label: "Semester Lanes",
        value: totalSemesters || (structures.length ? "Pending setup" : "Not mapped"),
        note: structures.length ? "Across active branches" : "Add branches to unlock"
      },
      {
        label: "Subjects",
        value: totalSubjects || (structures.length ? "Pending setup" : "Not created"),
        note: totalSubjects ? "Ready for resource upload" : "Build out semesters first"
      }
    ],
    [
      approvedCourses.length,
      programCards.length,
      selectedCollege?.name,
      selectedCollege?.shortName,
      structures,
      totalBranches,
      totalSemesters,
      totalSubjects
    ]
  );

  const heroStatusItems = useMemo(
    () => [
      {
        label: "Profile",
        value: profile ? "Ready" : loadingProfile ? "Loading" : "Pending"
      },
      {
        label: "Representatives",
        value: representativeDirectory.length ? `${representativeDirectory.length} mapped` : "No mapping"
      },
      {
        label: "Notices",
        value: notices.length ? `${notices.length} live` : "Quiet"
      }
    ],
    [loadingProfile, notices.length, profile, representativeDirectory.length]
  );

  const profileHighlights = useMemo(
    () =>
      profile
        ? [
            {
              label: "Entrance Exams",
              value: profile.entranceExams?.join(", ") || "Not provided"
            },
            {
              label: "NIRF Ranking",
              value: profile.rankings?.nirf || "Not provided"
            },
            {
              label: "QS Ranking",
              value: profile.rankings?.qs || "Not provided"
            },
            {
              label: "Average Package",
              value: profile.averagePackageLpa ? `${profile.averagePackageLpa} LPA` : "Not provided"
            },
            {
              label: "Highest Package",
              value: profile.highestPackageLpa ? `${profile.highestPackageLpa} LPA` : "Not provided"
            }
          ]
        : [],
    [profile]
  );

  const latestNoticePreview = notices[0] || null;

  return (
    <div className="page-stack">
      <section className="overview-hero-band">
        <div className="overview-hero-main">
          <p className="card-kicker">Academic Overview</p>
          <div className="overview-hero-heading">
            <div>
              <h1>{selectedCollege?.name || "Choose a college to begin"}</h1>
              <p className="muted">
                {selectedCollege
                  ? "A cleaner command view for academic structure, representative coverage, notices, and next actions."
                  : "Select a college from the Colleges page to load its academic workspace and overview details."}
              </p>
            </div>
            <div className="overview-status-row">
              {heroStatusItems.map((item) => {
                const statusIcon =
                  item.label === "Profile" ? "👤" :
                  item.label === "Representatives" ? "👥" : "📢";
                const isActive =
                  (item.label === "Profile" && item.value === "Ready") ||
                  (item.label === "Representatives" && representativeDirectory.length > 0) ||
                  (item.label === "Notices" && notices.length > 0);
                return (
                  <span className={`overview-status-pill ${isActive ? "status-active" : ""}`} key={item.label}>
                    <span className="status-pill-icon">{statusIcon}</span>
                    <strong>{item.label}</strong>
                    <span>{item.value}</span>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="overview-stat-strip">
            {dashboardStats.map((item, index) => {
              const statIcons = ["📚", "🌿", "📅", "📖"];
              const statColors = ["#f59e0b", "#10b981", "#6366f1", "#ec4899"];
              return (
                <article className="overview-stat-tile" key={item.label}>
                  <div className="stat-tile-header">
                    <span className="stat-tile-icon" style={{ background: `${statColors[index]}18`, color: statColors[index] }}>
                      {statIcons[index]}
                    </span>
                    <p className="overview-stat-label">{item.label}</p>
                  </div>
                  <h2>{item.value}</h2>
                  <p className="muted">{item.note}</p>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="overview-hero-side">
          <div className="overview-side-block">
            <div className="side-block-header">
              <span className="side-block-icon">🖥️</span>
              <p className="overview-side-label">Active workspace</p>
            </div>
            <h3>{selectedCollege?.shortName || "Not selected"}</h3>
            <p className="muted">
              {selectedCollege?.name || "Pick a college to unlock the academic dashboard."}
            </p>
          </div>
          <div className="overview-side-block">
            <div className="side-block-header">
              <span className="side-block-icon">📊</span>
              <p className="overview-side-label">Live snapshot</p>
            </div>
            <ul className="overview-bullet-list">
              <li><span className="bullet-count">{approvedCourses.length || 0}</span> approved course entries</li>
              <li><span className="bullet-count">{representativeDirectory.length || 0}</span> representative owners</li>
              <li><span className="bullet-count">{notices.length || 0}</span> recent notices visible</li>
            </ul>
          </div>
          <div className="overview-side-block">
            <div className="side-block-header">
              <span className="side-block-icon">📰</span>
              <p className="overview-side-label">Latest notice</p>
            </div>
            {latestNoticePreview ? (
              <>
                <h3>{latestNoticePreview.title}</h3>
                <p className="muted">
                  {latestNoticePreview.collegeName || "Platform-wide announcement"}
                </p>
              </>
            ) : (
              <p className="muted">No notice has been published for this workspace yet.</p>
            )}
          </div>
        </aside>
      </section>

      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab ${activeTab === "workspace" ? "active" : ""}`}
          onClick={() => setActiveTab("workspace")}
          type="button"
        >
          <span className="tab-icon">📚</span>
          <span>Academic Workspace</span>
        </button>
        <button
          className={`dashboard-tab ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
          type="button"
        >
          <span className="tab-icon">🏛️</span>
          <span>Institution Profile</span>
        </button>
        <button
          className={`dashboard-tab ${activeTab === "notices" ? "active" : ""}`}
          onClick={() => setActiveTab("notices")}
          type="button"
        >
          <span className="tab-icon">📢</span>
          <span>Notice Desk</span>
        </button>
      </div>

      {activeTab === "workspace" && (
        <>
          <SectionCard
            title="Academic Workspace"
            description="Open a program to continue into branch, semester, subject, and resource management."
          >
            {structures.length ? (
              <p className="muted">Database-managed academic structure is active for this college.</p>
            ) : approvedCourses.length ? (
              <p className="muted">
                Approved courses are available for this college. Open a course page to continue branch and semester setup.
              </p>
            ) : selectedCollege ? (
              <div className="sample-preview-banner">
                <span className="sample-preview-icon">💡</span>
                <div>
                  <strong>Sample Preview</strong>
                  <p>These are example programs to show how your workspace will look. Add your own courses from the panel to replace them with real data.</p>
                </div>
              </div>
            ) : null}
            <div className="list-toolbar">
              <input
                className="college-search"
                onChange={(event) => setProgramSearch(event.target.value)}
                placeholder="Search program, branch coverage, or summary..."
                type="text"
                value={programSearch}
              />
              <p className="muted">{filteredPrograms.length} programs visible</p>
            </div>
            <div className="program-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.5rem"
            }}>
              {filteredPrograms.map((program) => (
                <Link
                  className="branch-card program-link branch-card-enhanced"
                  key={program.id}
                  to={`/dashboard/${program.id}`}
                >
                  <div className="branch-card-accent" />
                  <div className="branch-card-body">
                    <div className="branch-card-top-row">
                      <span className="branch-icon">🏛️</span>
                      <span className="branch-program-tag">{program.name}</span>
                    </div>
                    <h3 className="branch-card-name">{program.branch}</h3>
                    <p className="muted branch-card-desc">{program.description}</p>
                  </div>
                  <div className="branch-card-footer">
                    <span className="branch-open-label">Open Course Flow</span>
                    <span className="branch-open-arrow">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Academic Operations"
            description="Manage course setup and quick subject creation without leaving the overview workspace."
          >
            {!canManageOverviewSubjects ? (
              <p className="muted">Only admins and representatives can manage courses and subjects from this page.</p>
            ) : (
              <div className="overview-operations-grid">
                <div className="overview-operation-pane">
                  <div className="overview-pane-header">
                    <div>
                      <p className="overview-side-label">Course manager</p>
                      <h3>Add or open a course</h3>
                    </div>
                    <p className="muted">Create the course first, then continue into branch and semester setup.</p>
                  </div>
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
                  <div className="overview-course-list">
                    {approvedCourses.map((course) => (
                      <article className="overview-course-item" key={course._id}>
                        <div>
                          <h4>{course.courseName}</h4>
                          <p className="muted">
                            {course.semesterCount
                              ? `${course.semesterCount} legacy semesters`
                              : "Semester count will be created branch-wise"}
                          </p>
                        </div>
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
                </div>

                <div className="overview-operation-pane">
                  <div className="overview-pane-header">
                    <div>
                      <p className="overview-side-label">Quick subject creator</p>
                      <h3>Add subjects to an existing semester</h3>
                    </div>
                    <p className="muted">Use this once branch and semester structure is already available.</p>
                  </div>
                  {!selectedCollege ? <p className="muted">Choose a college first.</p> : null}
                  {selectedCollege && !structures.length ? (
                    <p className="muted">
                      No branch-semester structure is available yet for this college. Create the academic structure from panel first.
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
                                  structures.find((program) => program.id === event.target.value)?.branches?.[0]?.id ||
                                  "",
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
              {lastCreatedSubject &&
              selectedProgramStructure &&
              selectedBranchStructure &&
              selectedSemesterStructure ? (
                <div className="overview-created-subject">
                  <div>
                    <h4>{lastCreatedSubject.name}</h4>
                    <p className="muted">
                      {selectedProgramStructure.name} | {selectedBranchStructure.name} |{" "}
                      {selectedSemesterStructure.semester}
                    </p>
                  </div>
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
                </div>
              ) : null}
            </div>
          </div>
        )}
      </SectionCard>
        </>
      )}

      {activeTab === "profile" && (
        <>
          {selectedCollege ? (
            <SectionCard
              title="College Profile"
              description="Institution highlights and placement statistics for this college."
            >
              {loadingProfile ? <p className="muted">Loading college details...</p> : null}
              {profileError ? <p className="auth-error">{profileError}</p> : null}
              {!loadingProfile && !profile ? (
                <p className="muted">
                  No detail profile is available for this college yet. A representative can add it from the panel.
                </p>
              ) : null}

              {!loadingProfile && profile ? (
                <div className="overview-profile-stack-full">
                  {/* Highlights Grid */}
                  <div className="profile-highlights-grid" style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    marginBottom: "1.5rem"
                  }}>
                    {profileHighlights.map((item) => (
                      <div key={item.label} className="detail-card" style={{
                        padding: "1rem",
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem"
                      }}>
                        <span className="overview-side-label" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</span>
                        <strong style={{ fontSize: "1.25rem", color: "#f8fafc" }}>{item.value}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Notes Grid */}
                  <div className="profile-notes-grid" style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "1.5rem"
                  }}>
                    <article className="detail-card" style={{
                      padding: "1.25rem",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)"
                    }}>
                      <span className="overview-side-label" style={{ fontSize: "0.875rem", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>Placement Report Summary</span>
                      <p className="muted" style={{ margin: 0, fontSize: "0.95rem", lineHeight: "1.6" }}>{profile.placementReport || "Not provided"}</p>
                    </article>
                    <article className="detail-card" style={{
                      padding: "1.25rem",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)"
                    }}>
                      <span className="overview-side-label" style={{ fontSize: "0.875rem", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>Cut Off Summary</span>
                      <p className="muted" style={{ margin: 0, fontSize: "0.95rem", lineHeight: "1.6" }}>{profile.cutOffSummary || "Not provided"}</p>
                    </article>
                    <article className="detail-card" style={{
                      padding: "1.25rem",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)"
                    }}>
                      <span className="overview-side-label" style={{ fontSize: "0.875rem", fontWeight: "600", display: "block", marginBottom: "0.5rem" }}>Other Rankings & Info</span>
                      <p className="muted" style={{ margin: 0, fontSize: "0.95rem", lineHeight: "1.6" }}>{profile.rankings?.other || "Not provided"}</p>
                    </article>
                  </div>
                </div>
              ) : null}
            </SectionCard>
          ) : (
            <SectionCard
              title="College Profile"
              description="Institution highlights and placement statistics for this college."
            >
              <p className="muted">Select a college first from Colleges page.</p>
            </SectionCard>
          )}

          <SectionCard
            title="Representative Coverage"
            description="Current course owners mapped to this college."
          >
            {!selectedCollege ? <p className="muted">Select a college first from Colleges page.</p> : null}
            {selectedCollege && !representativeDirectory.length ? (
              <p className="muted">No approved representatives are mapped to this college yet.</p>
            ) : null}
            <div className="overview-directory-list">
              {representativeDirectory.map((representative) => (
                <article className="overview-directory-item" key={representative.key}>
                  <div className="overview-directory-copy">
                    <h3>{representative.fullName}</h3>
                    <p className="muted">
                      {representative.courses.length} course entries | {representative.totalSemesters || "Branch-defined"} semester lanes
                    </p>
                  </div>
                  <button
                    className="action-button neutral"
                    onClick={() =>
                      setActiveRepresentativeKey((current) =>
                        current === representative.key ? "" : representative.key
                      )
                    }
                    type="button"
                  >
                    {activeRepresentativeKey === representative.key ? "Hide Courses" : "View Courses"}
                  </button>
                  {activeRepresentativeKey === representative.key ? (
                    <div className="overview-inline-chips">
                      {representative.courses.map((course) => (
                        <span
                          className="notes-focus-chip"
                          key={`${representative.key}-${course.courseName}-${course.semesterCount || "branch-defined"}`}
                        >
                          {course.courseName}
                          {course.semesterCount ? ` | ${course.semesterCount} semesters` : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </SectionCard>
        </>
      )}

      {activeTab === "notices" && (
        <SectionCard
          title="Notice Desk"
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
          <div className="overview-notice-list">
            {filteredNotices.map((notice) => (
              <article className="overview-notice-item" key={notice._id}>
                <div className="overview-notice-heading">
                  <div>
                    <h3>{notice.title}</h3>
                    <p className="muted">{notice.collegeName || "Platform-wide notice"}</p>
                  </div>
                </div>
                <p>{notice.content}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
