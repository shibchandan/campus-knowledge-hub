import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { academicPrograms } from "../features/dashboard/data";
import { groupStructuresIntoPrograms } from "../lib/academicHelpers";
import { apiClient } from "../lib/apiClient";

export function DashboardPage() {
  const { selectedCollege } = useCollege();
  const [programSearch, setProgramSearch] = useState("");
  const [noticeSearch, setNoticeSearch] = useState("");
  const [profile, setProfile] = useState(null);
  const [approvedCourses, setApprovedCourses] = useState([]);
  const [notices, setNotices] = useState([]);
  const [structures, setStructures] = useState([]);
  const [activeRepresentativeKey, setActiveRepresentativeKey] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

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
    async function loadApprovedCourses() {
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

    loadStructures();
  }, [selectedCollege?.name]);

  const programCards = useMemo(() => {
    if (structures.length) {
      return structures.map((program) => ({
        id: program.id,
        name: program.name,
        branch: `${program.branches.length} database-managed branches`,
        description: "This department structure is managed from the admin panel."
      }));
    }

    return academicPrograms;
  }, [structures]);

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
      const key = representative?._id || representative?.email || course._id;
      const existing = grouped.get(key) || {
        key,
        fullName: representative?.fullName || "Representative",
        email: representative?.email || "Email not available",
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

  const dashboardStats = useMemo(
    () => [
      {
        label: "Departments",
        value: filteredPrograms.length,
        note: structures.length ? "Database-driven" : "Starter overview"
      },
      {
        label: "Branches",
        value: structures.reduce((total, program) => total + program.branches.length, 0) || "Preset",
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
    [filteredPrograms.length, notices.length, profile, selectedCollege?.name, selectedCollege?.shortName, structures]
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
              <p className="muted">{representative.email}</p>
              <p className="muted">
                Manages {representative.courses.length} course entries | Total semesters covered:{" "}
                {representative.totalSemesters}
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
                      key={`${representative.key}-${course.courseName}-${course.semesterCount}`}
                    >
                      <h3>{course.courseName}</h3>
                      <p>{course.semesterCount} semesters</p>
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
