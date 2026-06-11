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

function humanizeSlug(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
  const [categoryCounts, setCategoryCounts] = useState({});

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

  useEffect(() => {
    async function loadCategoryCounts() {
      if (!selectedCollege?.name || !programId || !branchId || !semesterId || !subjectId) {
        setCategoryCounts({});
        return;
      }

      try {
        const response = await apiClient.get("/resources/category-counts", {
          params: {
            collegeName: selectedCollege.name,
            programId,
            branchId,
            semesterId,
            subjectId
          }
        });
        setCategoryCounts(response.data.data || {});
      } catch {
        setCategoryCounts({});
      }
    }

    loadCategoryCounts();
  }, [selectedCollege?.name, programId, branchId, semesterId, subjectId]);

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
  const resolvedSubject = dynamicSubject
    ? { id: dynamicSubject.subjectId, name: dynamicSubject.name }
    : !hasDynamicSubjectData
      ? fallbackSubject
      : null;
  const programName = program?.name || humanizeSlug(programId);
  const branchName = branch?.name || humanizeSlug(branchId);
  const semesterName = semester?.semester || humanizeSlug(semesterId);
  const subject = resolvedSubject || {
    id: subjectId,
    name: humanizeSlug(subjectId)
  };

  if (!structureLoaded) {
    return (
      <div className="page-stack">
        <SectionCard title="Loading subject workspace" description="Fetching branch, semester, and subject context.">
          <p className="muted">Loading subject details...</p>
        </SectionCard>
      </div>
    );
  }

  if (!selectedCollege?.name) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="page-stack">
      <SectionCard
        title={subject.name}
        description={`${programName} | ${branchName} | ${semesterName} resource categories`}
      >
        <div className="detail-header">
          <div>
            <p className="program-badge">{programName}</p>
            <p className="muted">{branchName}</p>
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
          {subjectCategories.map((category) => {
            const count = categoryCounts[category.id] || 0;
            return (
              <Link
                className="resource-card resource-link category-card-enhanced"
                key={category.id}
                to={`/dashboard/${programId}/branch/${branchId}/${semesterId}/${subjectId}/${category.id}`}
              >
                <div className="category-card-header">
                  <span className="category-icon">{category.icon}</span>
                  <span className={`category-count-badge ${count > 0 ? "has-resources" : ""}`}>
                    {count > 0 ? `${count} file${count !== 1 ? "s" : ""}` : "Empty"}
                  </span>
                </div>
                <h3 className="category-title">{category.label}</h3>
                <p className="muted category-desc">{category.description}</p>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
