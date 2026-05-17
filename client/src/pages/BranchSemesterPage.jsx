import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { getBranchById, getProgramById } from "../features/dashboard/data";
import { getDynamicBranchById, getDynamicProgramById, groupStructuresIntoPrograms } from "../lib/academicHelpers";
import { apiClient } from "../lib/apiClient";
import { useToast } from "../ui/ToastContext";

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BranchSemesterPage() {
  const { programId, branchId } = useParams();
  const { user } = useAuth();
  const { selectedCollege } = useCollege();
  const { showError, showSuccess } = useToast();
  const fallbackProgram = getProgramById(programId, selectedCollege?.name || "");
  const fallbackBranch = getBranchById(fallbackProgram, branchId);
  const [dynamicPrograms, setDynamicPrograms] = useState([]);
  const [dynamicSubjects, setDynamicSubjects] = useState([]);
  const [structureLoaded, setStructureLoaded] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    semesterId: "",
    subjectName: "",
    subjectId: ""
  });
  const [subjectBusy, setSubjectBusy] = useState(false);

  useEffect(() => {
    async function loadStructure() {
      if (!selectedCollege?.name) {
        setDynamicPrograms([]);
        setStructureLoaded(true);
        return;
      }

      try {
        const response = await apiClient.get("/academic/structures", {
          params: { collegeName: selectedCollege.name, programId, branchId }
        });
        setDynamicPrograms(groupStructuresIntoPrograms(response.data.data));
      } catch {
        setDynamicPrograms([]);
      } finally {
        setStructureLoaded(true);
      }
    }

    setStructureLoaded(false);
    loadStructure();
  }, [branchId, programId, selectedCollege?.name]);

  useEffect(() => {
    async function loadDynamicSubjects() {
      if (!selectedCollege?.name || !programId || !branchId) {
        setDynamicSubjects([]);
        return;
      }

      try {
        const response = await apiClient.get("/academic/subjects", {
          params: {
            collegeName: selectedCollege.name,
            programId,
            branchId
          }
        });
        setDynamicSubjects(response.data.data);
      } catch {
        setDynamicSubjects([]);
      }
    }

    loadDynamicSubjects();
  }, [branchId, programId, selectedCollege?.name]);

  const dynamicProgram = useMemo(
    () => getDynamicProgramById(dynamicPrograms, programId),
    [dynamicPrograms, programId]
  );
  const dynamicBranch = useMemo(
    () => getDynamicBranchById(dynamicProgram, branchId),
    [dynamicProgram, branchId]
  );
  const hasDynamicProgramData = Boolean(dynamicPrograms.length);
  const program = dynamicProgram || (!hasDynamicProgramData ? fallbackProgram : null);
  const branch = dynamicBranch || (!hasDynamicProgramData ? fallbackBranch : null);

  const semesters = useMemo(() => {
    if (!branch) {
      return [];
    }

    if (!dynamicBranch) {
      return branch.semesters || [];
    }

    return dynamicBranch.semesters.map((semester) => ({
      ...semester,
      subjects: dynamicSubjects
        .filter((subject) => subject.semesterId === semester.id)
        .map((subject) => ({
          id: subject.subjectId,
          name: subject.name
        }))
    }));
  }, [branch, dynamicBranch, dynamicSubjects]);
  const canManageBranch = user?.role === "admin" || user?.role === "representative";

  useEffect(() => {
    if (!semesters.length) {
      return;
    }

    setSubjectForm((current) => ({
      semesterId: current.semesterId || semesters[0].id,
      subjectName: current.subjectName,
      subjectId: current.subjectId
    }));
  }, [semesters]);

  async function handleCreateSubject(event) {
    event.preventDefault();

    if (!selectedCollege?.name || !program || !branch) {
      showError("Choose a valid college branch first.");
      return;
    }

    setSubjectBusy(true);

    try {
      await apiClient.post("/academic/subjects", {
        collegeName: selectedCollege.name,
        programId: program.id,
        branchId: branch.id,
        semesterId: subjectForm.semesterId,
        subjectId: subjectForm.subjectId || slugify(subjectForm.subjectName),
        name: subjectForm.subjectName
      });

      setSubjectForm((current) => ({
        ...current,
        subjectName: "",
        subjectId: ""
      }));
      showSuccess(
        "Subject created successfully. Its notice, syllabus, books, class notes, PDF/PPT, lecture, lab, PYQ, and suggestion pages are now available."
      );

      const response = await apiClient.get("/academic/subjects", {
        params: {
          collegeName: selectedCollege.name,
          programId,
          branchId
        }
      });
      setDynamicSubjects(response.data.data);
    } catch (requestError) {
      showError(requestError.response?.data?.message || "Failed to create subject.");
    } finally {
      setSubjectBusy(false);
    }
  }

  if (!structureLoaded) {
    return (
      <div className="page-stack">
        <SectionCard title="Loading academic structure" description="Fetching branch and semester data for this college.">
          <p className="muted">Loading branch details...</p>
        </SectionCard>
      </div>
    );
  }

  if (!program || !branch) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="page-stack">
      <SectionCard
        title={`${branch.name} Semester Structure`}
        description={`${program.name} semester-wise subjects`}
      >
        <div className="detail-header">
          <div>
            <p className="program-badge">{program.name}</p>
            <h3>{branch.name}</h3>
            <p className="muted">
              {semesters.length} semester view with subject list for each semester.
            </p>
            {dynamicBranch ? (
              <p className="muted">This branch and semester structure is managed from the database.</p>
            ) : null}
          </div>
          <Link className="back-link" to={`/dashboard/${programId}`}>
            Back to branches
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Semester Structure"
        description={
          dynamicBranch
            ? "Admin-managed semester and subject structure is active for this college."
            : "Fallback semester-wise subject structure is shown for the selected college."
        }
      >
        <div className="semester-grid">
          {semesters.map((item) => (
            <article className="semester-card" key={item.id}>
              <div className="semester-header">
                <h3>{item.semester}</h3>
                <span>{item.subjects.length} Subjects</span>
              </div>
              <div className="subject-list">
                {item.subjects.map((subject) => (
                  <Link
                    className="subject-pill subject-link"
                    key={subject.id}
                    to={`/dashboard/${programId}/branch/${branchId}/${item.id}/${subject.id}`}
                  >
                    {subject.name}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      {canManageBranch && semesters.length ? (
        <SectionCard
          title="Add Subject"
          description="Choose a semester and add subjects one by one. Each subject automatically gets notice, syllabus, books, class notes, PDF/PPT, lecture, lab, PYQ, and suggestion sections."
        >
          <form className="panel-form" onSubmit={handleCreateSubject}>
            <div className="panel-form-grid">
              <label className="auth-field">
                <span>Branch</span>
                <input readOnly type="text" value={branch.name} />
              </label>
              <label className="auth-field">
                <span>Semester</span>
                <select
                  onChange={(event) =>
                    setSubjectForm((current) => ({ ...current, semesterId: event.target.value }))
                  }
                  value={subjectForm.semesterId}
                >
                  {semesters.map((semester) => (
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
                    setSubjectForm((current) => ({ ...current, subjectName: event.target.value }))
                  }
                  placeholder="Mathematics-I"
                  required
                  type="text"
                  value={subjectForm.subjectName}
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
            </div>
            <div className="panel-actions">
              <button className="open-college-button" disabled={subjectBusy} type="submit">
                {subjectBusy ? "Creating Subject..." : "Add Subject"}
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}
    </div>
  );
}
