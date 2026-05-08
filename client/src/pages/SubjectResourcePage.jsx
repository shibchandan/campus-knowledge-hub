import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import {
  getBranchById,
  getProgramById,
  getSemesterById,
  getSubjectById,
  subjectCategories
} from "../features/dashboard/data";
import { getDynamicBranchById, getDynamicProgramById, groupStructuresIntoPrograms } from "../lib/academicHelpers";
import { apiClient } from "../lib/apiClient";

export function SubjectResourcePage() {
  const { programId, branchId, semesterId, subjectId } = useParams();
  const { selectedCollege } = useCollege();
  const fallbackProgram = getProgramById(programId, selectedCollege?.name || "");
  const fallbackBranch = getBranchById(fallbackProgram, branchId);
  const fallbackSemester = getSemesterById(fallbackBranch, semesterId);
  const [dynamicPrograms, setDynamicPrograms] = useState([]);
  const fallbackSubject = getSubjectById(fallbackSemester, subjectId);
  const [dynamicSubjects, setDynamicSubjects] = useState([]);
  const [structureLoaded, setStructureLoaded] = useState(false);

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
      if (!selectedCollege?.name || !programId || !branchId || !semesterId) {
        setDynamicSubjects([]);
        return;
      }

      try {
        const response = await apiClient.get("/academic/subjects", {
          params: {
            collegeName: selectedCollege.name,
            programId,
            branchId,
            semesterId
          }
        });
        setDynamicSubjects(response.data.data);
      } catch {
        setDynamicSubjects([]);
      }
    }

    loadDynamicSubjects();
  }, [branchId, programId, selectedCollege?.name, semesterId]);

  const dynamicProgram = useMemo(
    () => getDynamicProgramById(dynamicPrograms, programId),
    [dynamicPrograms, programId]
  );
  const dynamicBranch = useMemo(
    () => getDynamicBranchById(dynamicProgram, branchId),
    [dynamicProgram, branchId]
  );
  const dynamicSemester = useMemo(
    () => dynamicBranch?.semesters?.find((item) => item.id === semesterId) || null,
    [dynamicBranch, semesterId]
  );
  const hasDynamicProgramData = Boolean(dynamicPrograms.length);
  const program = dynamicProgram || (!hasDynamicProgramData ? fallbackProgram : null);
  const branch = dynamicBranch || (!hasDynamicProgramData ? fallbackBranch : null);
  const semester = dynamicSemester || (!hasDynamicProgramData ? fallbackSemester : null);

  const dynamicSubject = useMemo(
    () => dynamicSubjects.find((item) => item.subjectId === subjectId),
    [dynamicSubjects, subjectId]
  );
  const hasDynamicSubjectData = Boolean(dynamicSubjects.length);
  const subject = dynamicSubject
    ? { id: dynamicSubject.subjectId, name: dynamicSubject.name }
    : !hasDynamicSubjectData
      ? fallbackSubject
      : null;

  if (!structureLoaded) {
    return (
      <div className="page-stack">
        <SectionCard title="Loading subject workspace" description="Fetching branch, semester, and subject context.">
          <p className="muted">Loading subject details...</p>
        </SectionCard>
      </div>
    );
  }

  if (!program || !branch || (!semester && !dynamicSubject) || !subject) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="page-stack">
      <SectionCard
        title={subject.name}
        description={`${program.name} | ${branch.name} | ${(semester?.semester || semesterId)} resource categories`}
      >
        <div className="detail-header">
          <div>
            <p className="program-badge">{program.name}</p>
            <p className="muted">{branch.name}</p>
            <h3>{subject.name}</h3>
            <p className="muted">
              Open any category to organize study material for this subject.
            </p>
          </div>
          <Link className="back-link" to={`/dashboard/${programId}/branch/${branchId}`}>
            Back to semesters
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Subject Categories"
        description="All important academic resources for this subject are grouped here."
      >
        <div className="resource-grid">
          {subjectCategories.map((category) => (
            <Link
              className="resource-card resource-link"
              key={category.id}
              to={`/dashboard/${programId}/branch/${branchId}/${semesterId}/${subjectId}/${category.id}`}
            >
              <div className="resource-card-top">
                <p className="resource-badge">{category.label}</p>
                <span className="resource-count">View</span>
              </div>
              <h3>{category.label}</h3>
              <p className="muted">{category.description}</p>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
