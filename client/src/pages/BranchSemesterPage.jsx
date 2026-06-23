import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { SectionCard } from "../components/SectionCard";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { useCollege } from "../college/CollegeContext";
import { getBranchById, getProgramById } from "../features/dashboard/data";
import { getDynamicBranchById, getDynamicProgramById, groupStructuresIntoPrograms } from "../lib/academicHelpers";
import { apiClient } from "../lib/apiClient";
import { useToast } from "../ui/ToastContext";
import { requestDeletePassword } from "../lib/deleteWithPassword";

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
  const [editingSubject, setEditingSubject] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", subjectId: "" });
  const [expandedSemesters, setExpandedSemesters] = useState({});

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
          _id: subject._id,
          id: subject.subjectId,
          name: subject.name,
          semesterId: subject.semesterId
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

  useEffect(() => {
    if (!semesters.length) {
      return;
    }

    setExpandedSemesters((current) => {
      const next = { ...current };
      semesters.forEach((sem) => {
        if (next[sem.id] === undefined) {
          next[sem.id] = sem.subjects.length > 0;
        }
      });
      return next;
    });
  }, [semesters]);

  function toggleSemester(semesterId) {
    setExpandedSemesters((current) => ({
      ...current,
      [semesterId]: !current[semesterId]
    }));
  }

  function startEditSubject(subject) {
    setEditingSubject(subject);
    setEditForm({
      name: subject.name,
      subjectId: subject.id
    });
  }

  function cancelEditSubject() {
    setEditingSubject(null);
    setEditForm({ name: "", subjectId: "" });
  }

  async function handleUpdateSubject(event) {
    event.preventDefault();

    if (!selectedCollege?.name || !program || !branch || !editingSubject) {
      showError("Choose a valid college branch first.");
      return;
    }

    setSubjectBusy(true);

    try {
      await apiClient.patch(`/academic/subjects/${editingSubject._id}`, {
        collegeName: selectedCollege.name,
        programId: program.id,
        branchId: branch.id,
        semesterId: editingSubject.semesterId,
        subjectId: editForm.subjectId || slugify(editForm.name),
        name: editForm.name
      });

      showSuccess("Subject updated successfully.");
      cancelEditSubject();

      const response = await apiClient.get("/academic/subjects", {
        params: {
          collegeName: selectedCollege.name,
          programId,
          branchId
        }
      });
      setDynamicSubjects(response.data.data);
    } catch (requestError) {
      showError(requestError.response?.data?.message || "Failed to update subject.");
    } finally {
      setSubjectBusy(false);
    }
  }

  async function handleDeleteSubject() {
    if (!editingSubject) {
      return;
    }

    const currentPassword = requestDeletePassword("this subject");
    if (!currentPassword) {
      return;
    }

    setSubjectBusy(true);

    try {
      await apiClient.delete(`/academic/subjects/${editingSubject._id}`, {
        data: { currentPassword }
      });

      showSuccess("Subject deleted successfully.");
      cancelEditSubject();

      const response = await apiClient.get("/academic/subjects", {
        params: {
          collegeName: selectedCollege.name,
          programId,
          branchId
        }
      });
      setDynamicSubjects(response.data.data);
    } catch (requestError) {
      showError(requestError.response?.data?.message || "Failed to delete subject.");
    } finally {
      setSubjectBusy(false);
    }
  }

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

  
  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: program?.name || "Program", href: `/dashboard/${programId}` },
    { label: branch?.name || "Branch", href: `/dashboard/${programId}/branch/${branchId}` }
  ];

  return (
    <div className="page-stack">
      <Breadcrumbs items={breadcrumbItems} />
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
            ? "Admin-managed semester and subject structure is active for this college. Click any subject to open its resource workspace."
            : "Fallback semester-wise subject structure is shown for the selected college. Click any subject to open its resource workspace."
        }
      >
        <div className="semester-accordion-list">
          {semesters.map((item, index) => {
            const isExpanded = Boolean(expandedSemesters[item.id]);
            const semNumber = index + 1;
            return (
              <div
                className={`semester-accordion-item semester-enhanced${isExpanded ? " expanded" : ""}`}
                key={item.id}
              >
                <button
                  className="semester-accordion-header"
                  onClick={() => toggleSemester(item.id)}
                  type="button"
                >
                  <div className="semester-header-info">
                    <span className="semester-number-icon">{semNumber}</span>
                    <span className="chevron-icon" style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width="16" height="16">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </span>
                    <h3>{item.semester}</h3>
                  </div>
                  <span className={`subject-count-badge${item.subjects.length > 0 ? " active" : ""}`}>
                    {item.subjects.length > 0 ? `📖 ${item.subjects.length}` : "0"} {item.subjects.length === 1 ? "Subject" : "Subjects"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="semester-accordion-content">
                    {item.subjects.length > 0 ? (
                      <div className="subject-grid-list subject-grid-enhanced">
                        {item.subjects.map((subject) => (
                          <div key={subject.id} className="subject-item-wrapper subject-card-enhanced">
                            <Link
                              className="subject-pill subject-link subject-card-link"
                              to={`/dashboard/${programId}/branch/${branchId}/${item.id}/${subject.id}`}
                            >
                              <div className="subject-card-top">
                                <span className="subject-card-icon">📖</span>
                                <span className="subject-card-name">{subject.name}</span>
                              </div>
                              <div className="subject-card-bottom">
                                <span className="subject-open-label">Open Resources</span>
                                <span className="subject-open-arrow">→</span>
                              </div>
                            </Link>
                            {canManageBranch && (
                              <button
                                onClick={() => startEditSubject(subject)}
                                className="subject-action-btn"
                                title="Edit Subject"
                                type="button"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-subjects-note">📭 No subjects added for this semester yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

      {editingSubject && (
        <div className="filter-modal-overlay" onClick={cancelEditSubject} role="presentation">
          <div className="filter-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="filter-modal-header">
              <h3>Edit Subject</h3>
              <button className="filter-modal-close" onClick={cancelEditSubject} type="button">
                &times;
              </button>
            </div>

            <form className="panel-form" onSubmit={handleUpdateSubject} style={{ marginTop: 0, border: 'none', background: 'transparent', padding: 0 }}>
              <div className="panel-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <label className="auth-field">
                  <span>Subject Name</span>
                  <input
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Enter new subject name"
                    required
                    type="text"
                    value={editForm.name}
                  />
                </label>
                <label className="auth-field">
                  <span>Subject ID</span>
                  <input
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, subjectId: event.target.value }))
                    }
                    placeholder="Enter subject ID (e.g. data-mining)"
                    required
                    type="text"
                    value={editForm.subjectId}
                  />
                </label>
              </div>

              <div className="panel-actions" style={{ justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="open-college-button"
                  onClick={handleDeleteSubject}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  disabled={subjectBusy}
                >
                  Delete Subject
                </button>
                <button
                  type="submit"
                  className="open-college-button"
                  disabled={subjectBusy}
                >
                  {subjectBusy ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
