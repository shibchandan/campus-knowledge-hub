import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { getProgramById } from "../features/dashboard/data";
import { groupStructuresIntoPrograms, getDynamicProgramById } from "../lib/academicHelpers";
import { apiClient } from "../lib/apiClient";
import { useToast } from "../ui/ToastContext";

function normalizeProgramKey(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProgramDetailPage() {
  const { programId } = useParams();
  const { user } = useAuth();
  const { selectedCollege } = useCollege();
  const { showError, showSuccess } = useToast();
  const fallbackProgram = getProgramById(programId, selectedCollege?.name || "");
  const [dynamicPrograms, setDynamicPrograms] = useState([]);
  const [approvedCourses, setApprovedCourses] = useState([]);
  const [branchForm, setBranchForm] = useState({
    branchName: "",
    branchDescription: "",
    semesterCount: 8
  });
  const [branchBusy, setBranchBusy] = useState(false);

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
    async function loadStructures() {
      if (!selectedCollege?.name) {
        setDynamicPrograms([]);
        return;
      }

      try {
        const response = await apiClient.get("/academic/structures", {
          params: { collegeName: selectedCollege.name, programId }
        });
        setDynamicPrograms(groupStructuresIntoPrograms(response.data.data));
      } catch {
        setDynamicPrograms([]);
      }
    }

    loadStructures();
  }, [programId, selectedCollege?.name]);

  const dynamicProgram = useMemo(
    () => getDynamicProgramById(dynamicPrograms, programId),
    [dynamicPrograms, programId]
  );
  const approvedProgram = useMemo(() => {
    const matchedCourse = approvedCourses.find(
      (course) => normalizeProgramKey(course.courseName) === programId
    );

    if (!matchedCourse) {
      return null;
    }

    return {
      id: programId,
      name: matchedCourse.courseName,
      branchLabel: "Branch / Domain",
      branches: []
    };
  }, [approvedCourses, programId]);
  const program = dynamicProgram || approvedProgram || fallbackProgram;
  const canManageCourse = user?.role === "admin" || user?.role === "representative";

  async function handleCreateBranch(event) {
    event.preventDefault();

    if (!selectedCollege?.name || !program) {
      showError("Choose a college and course first.");
      return;
    }

    setBranchBusy(true);

    try {
      const branchId = normalizeProgramKey(branchForm.branchName);
      const semesterCount = Number(branchForm.semesterCount || 0);

      for (let index = 1; index <= semesterCount; index += 1) {
        await apiClient.post("/academic/structures", {
          collegeName: selectedCollege.name,
          programId: program.id,
          programName: program.name,
          branchId,
          branchName: branchForm.branchName,
          branchDescription: branchForm.branchDescription,
          semesterId: `semester-${index}`,
          semesterName: `Semester ${index}`,
          semesterOrder: index
        });
      }

      setBranchForm({
        branchName: "",
        branchDescription: "",
        semesterCount: 8
      });
      showSuccess("Branch and semesters created successfully.");
      const response = await apiClient.get("/academic/structures", {
        params: { collegeName: selectedCollege.name, programId }
      });
      setDynamicPrograms(groupStructuresIntoPrograms(response.data.data));
    } catch (requestError) {
      showError(requestError.response?.data?.message || "Failed to create branch and semesters.");
    } finally {
      setBranchBusy(false);
    }
  }

  if (!program) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="page-stack">
      <SectionCard
        title={`${program.name} Department`}
        description={`Choose a ${program.branchLabel.toLowerCase()} to open semesters.`}
      >
        <div className="detail-header">
          <div>
            <p className="program-badge">{program.name}</p>
            <h3>{program.branchLabel}</h3>
            <p className="muted">
              {program.branches.length
                ? `${program.branches.length} options available. Click one to open semester page.`
                : "No branch options are available yet for this course."}
            </p>
            {dynamicProgram ? (
              <p className="muted">This program is being served from the database for the selected college.</p>
            ) : null}
            {!dynamicProgram && approvedProgram ? (
              <p className="muted">
                This course is approved for the selected college. Branch and semester structure has not been added yet.
              </p>
            ) : null}
          </div>
          <Link className="back-link" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Branch List" description="Select any branch/domain to continue.">
        {program.branches.length ? (
          <div className="branch-grid">
            {program.branches.map((branch) => (
              <Link
                className="branch-card program-link branch-card-enhanced"
                key={branch.id}
                to={`/dashboard/${programId}/branch/${branch.id}`}
              >
                <div className="branch-card-accent" />
                <div className="branch-card-body">
                  <div className="branch-card-top-row">
                    <span className="branch-icon">🖥️</span>
                    <span className="branch-program-tag">{program.name}</span>
                  </div>
                  <h3 className="branch-card-name">{branch.name}</h3>
                  <p className="muted branch-card-desc">{branch.description}</p>
                </div>
                <div className="branch-card-footer">
                  <span className="branch-open-label">Open Semesters</span>
                  <span className="branch-open-arrow">→</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">
            No branch list has been created for this course yet. The college representative can add branches,
            semesters, and subjects from the panel.
          </p>
        )}
      </SectionCard>

      {canManageCourse ? (
        <SectionCard
          title="Add Branch"
          description="Create one branch here and choose how many semesters it should open with."
        >
          <form className="panel-form" onSubmit={handleCreateBranch}>
            <div className="panel-form-grid">
              <label className="auth-field">
                <span>Course</span>
                <input readOnly type="text" value={program.name} />
              </label>
              <label className="auth-field">
                <span>Branch Name</span>
                <input
                  onChange={(event) =>
                    setBranchForm((current) => ({ ...current, branchName: event.target.value }))
                  }
                  placeholder="Computer Science & Engineering"
                  required
                  type="text"
                  value={branchForm.branchName}
                />
              </label>
              <label className="auth-field">
                <span>Semester Count</span>
                <input
                  min="1"
                  max="20"
                  onChange={(event) =>
                    setBranchForm((current) => ({
                      ...current,
                      semesterCount: Number(event.target.value || 1)
                    }))
                  }
                  required
                  type="number"
                  value={branchForm.semesterCount}
                />
              </label>
              <label className="auth-field">
                <span>Branch Description</span>
                <input
                  onChange={(event) =>
                    setBranchForm((current) => ({
                      ...current,
                      branchDescription: event.target.value
                    }))
                  }
                  placeholder="Core computing program with systems, software, and theory."
                  type="text"
                  value={branchForm.branchDescription}
                />
              </label>
            </div>
            <div className="panel-actions">
              <button className="open-college-button" disabled={branchBusy} type="submit">
                {branchBusy ? "Creating Branch..." : "Add Branch With Semesters"}
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}
    </div>
  );
}
