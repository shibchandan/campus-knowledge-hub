import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { getProgramById } from "../features/dashboard/data";
import { groupStructuresIntoPrograms, getDynamicProgramById } from "../lib/academicHelpers";
import { apiClient } from "../lib/apiClient";

function normalizeProgramKey(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProgramDetailPage() {
  const { programId } = useParams();
  const { selectedCollege } = useCollege();
  const fallbackProgram = getProgramById(programId, selectedCollege?.name || "");
  const [dynamicPrograms, setDynamicPrograms] = useState([]);
  const [approvedCourses, setApprovedCourses] = useState([]);

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
                className="branch-card program-link"
                key={branch.id}
                to={`/dashboard/${programId}/branch/${branch.id}`}
              >
                <p className="program-badge">{program.name}</p>
                <h3>{branch.name}</h3>
                <p className="muted">{branch.description}</p>
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
    </div>
  );
}
