import React from "react";

export function SubjectForm({
  formValue,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  collegesList,
  programsList,
  submitting = false
}) {
  return (
    <form className="panel-form" onSubmit={onSubmit}>
      <div className="panel-form-grid">
        <label className="auth-field">
          <span>College Name</span>
          <select
            onChange={(event) => onChange("collegeName", event.target.value)}
            required
            value={formValue.collegeName}
          >
            <option value="">-- Select College --</option>
            {collegesList.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-field">
          <span>Program ID</span>
          <select
            onChange={(event) => onChange("programId", event.target.value)}
            required
            value={formValue.programId}
          >
            <option value="">-- Select Program --</option>
            {programsList.map((name) => (
              <option key={name} value={name.toLowerCase()}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-field">
          <span>Branch ID</span>
          <input
            onChange={(event) => onChange("branchId", event.target.value)}
            placeholder="cs"
            required
            type="text"
            value={formValue.branchId}
          />
        </label>
        <label className="auth-field">
          <span>Semester ID</span>
          <input
            onChange={(event) => onChange("semesterId", event.target.value)}
            placeholder="sem3"
            required
            type="text"
            value={formValue.semesterId}
          />
        </label>
        <label className="auth-field">
          <span>Subject ID</span>
          <input
            onChange={(event) => onChange("subjectId", event.target.value)}
            placeholder="dsa"
            required
            type="text"
            value={formValue.subjectId}
          />
        </label>
        <label className="auth-field">
          <span>Subject Name</span>
          <input
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="Data Structures and Algorithms"
            required
            type="text"
            value={formValue.name}
          />
        </label>
      </div>
      <div className="panel-actions">
        <button className="auth-submit" disabled={submitting} type="submit">
          {isEditing ? "Update Subject" : "Create Subject"}
        </button>
        {isEditing ? (
          <button className="theme-button" onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
