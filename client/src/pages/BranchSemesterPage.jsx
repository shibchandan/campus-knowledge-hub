import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { getBranchById, getProgramById } from "../features/dashboard/data";
import { getDynamicBranchById, getDynamicProgramById, groupStructuresIntoPrograms } from "../lib/academicHelpers";
import { apiClient } from "../lib/apiClient";

export function BranchSemesterPage() {
  const { programId, branchId } = useParams();
  const { selectedCollege } = useCollege();
  const fallbackProgram = getProgramById(programId);
  const fallbackBranch = getBranchById(fallbackProgram, branchId);
  const [dynamicPrograms, setDynamicPrograms] = useState([]);
  const [dynamicSubjects, setDynamicSubjects] = useState([]);

  useEffect(() => {
    async function loadStructure() {
      if (!selectedCollege?.name) {
        setDynamicPrograms([]);
        return;
      }

      try {
        const response = await apiClient.get("/academic/structures", {
          params: { collegeName: selectedCollege.name, programId, branchId }
        });
        setDynamicPrograms(groupStructuresIntoPrograms(response.data.data));
      } catch {
        setDynamicPrograms([]);
      }
    }

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
  const program = dynamicProgram || fallbackProgram;
  const branch = dynamicBranch || fallbackBranch;

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
            : "Each semester contains five subjects."
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
    </div>
  );
}
