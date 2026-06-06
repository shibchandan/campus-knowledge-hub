import React from "react";

export function StructureForm({
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
          <span>Program Name</span>
          <input
            onChange={(event) => onChange("programName", event.target.value)}
            placeholder="BTech"
            required
            type="text"
            value={formValue.programName}
          />
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
          <span>Branch Name</span>
          <input
            onChange={(event) => onChange("branchName", event.target.value)}
            placeholder="Computer Science"
            required
            type="text"
            value={formValue.branchName}
          />
        </label>
        <label className="auth-field">
          <span>Branch Description</span>
          <input
            onChange={(event) => onChange("branchDescription", event.target.value)}
            placeholder="Core computer science curriculum"
            type="text"
            value={formValue.branchDescription}
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
          <span>Semester Name</span>
          <input
            onChange={(event) => onChange("semesterName", event.target.value)}
            placeholder="Semester 3"
            required
            type="text"
            value={formValue.semesterName}
          />
        </label>
        <label className="auth-field">
          <span>Semester Order</span>
          <input
            min="1"
            onChange={(event) => onChange("semesterOrder", event.target.value)}
            required
            type="number"
            value={formValue.semesterOrder}
          />
        </label>
      </div>
      <div className="panel-actions">
        <button className="auth-submit" disabled={submitting} type="submit">
          {isEditing ? "Update Structure" : "Create Academic Structure"}
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
