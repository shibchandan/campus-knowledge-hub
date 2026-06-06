import React from "react";

export function CourseForm({
  formValue,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  isDropdown = false,
  collegesList = [],
  selectedCourseCatalogEntry = null,
  submitting = false
}) {
  return (
    <form className="panel-form" onSubmit={onSubmit}>
      <div className="panel-form-grid">
        <label className="auth-field">
          <span>College Name</span>
          {isDropdown ? (
            <select
              onChange={(event) => onChange("collegeName", event.target.value)}
              required
              value={formValue.collegeName}
            >
              <option value="">-- Select College --</option>
              {collegesList.map((item) => {
                const name = typeof item === "string" ? item : (item.collegeName || item.name || "");
                const label = typeof item === "string" ? item : `${item.collegeName || item.name || ""} ${item.shortName ? `(${item.shortName})` : ""}`.trim();
                return (
                  <option key={name} value={name}>
                    {label}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              onChange={(event) => onChange("collegeName", event.target.value)}
              placeholder="Motilal Nehru National Institute of Technology, Prayagraj"
              required
              type="text"
              value={formValue.collegeName}
            />
          )}
        </label>
        <label className="auth-field">
          <span>Course Name</span>
          <input
            onChange={(event) => onChange("courseName", event.target.value)}
            placeholder="BTech"
            required
            type="text"
            value={formValue.courseName}
          />
        </label>
      </div>

      {selectedCourseCatalogEntry ? (
        <div className="catalog-preview-info">
          <p>
            <strong>Catalog Location:</strong> {selectedCourseCatalogEntry.location || "N/A"}
          </p>
          {selectedCourseCatalogEntry.hasActiveRepresentative ? (
            <p className="rejected-note" style={{ color: "#8a2f0d" }}>
              This college already has an active representative.
            </p>
          ) : (
            <p className="success-note" style={{ color: "#1d7a3d" }}>
              This college is available for registration.
            </p>
          )}
        </div>
      ) : null}

      <div className="panel-actions">
        <button className="auth-submit" disabled={submitting} type="submit">
          {isEditing
            ? (isDropdown ? "Update College Request" : "Update Course")
            : (isDropdown ? "Submit College Representative Request" : "Create College Course")}
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
