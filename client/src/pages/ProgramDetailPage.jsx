import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { getProgramById } from "../features/dashboard/data";
import { groupStructuresIntoPrograms, getDynamicProgramById } from "../lib/academicHelpers";
import { apiClient } from "../lib/apiClient";

export function ProgramDetailPage() {
  const { programId } = useParams();
  const { selectedCollege } = useCollege();
  const fallbackProgram = getProgramById(programId, selectedCollege?.name || "");
  const [dynamicPrograms, setDynamicPrograms] = useState([]);

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
  const program = dynamicProgram || fallbackProgram;

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
              {program.branches.length} options available. Click one to open semester page.
            </p>
            {dynamicProgram ? (
              <p className="muted">This program is being served from the database for the selected college.</p>
            ) : null}
          </div>
          <Link className="back-link" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Branch List" description="Select any branch/domain to continue.">
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
      </SectionCard>
    </div>
  );
}
