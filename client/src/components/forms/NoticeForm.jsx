import React from "react";

export function NoticeForm({
  formValue,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  isDropdown = false,
  collegesList = [],
  submitting = false
}) {
  return (
    <form className="panel-form" onSubmit={onSubmit}>
      <div className="panel-form-grid">
        <label className="auth-field">
          <span>College Name (optional)</span>
          {isDropdown ? (
            <select
              onChange={(event) => onChange("collegeName", event.target.value)}
              value={formValue.collegeName || ""}
            >
              <option value="">Global / Select College</option>
              {collegesList.map((item) => {
                const name = typeof item === "string" ? item : (item.collegeName || item.name || "");
                if (!name) return null;
                return (
                  <option key={name} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              onChange={(event) => onChange("collegeName", event.target.value)}
              placeholder="Leave empty for global"
              type="text"
              value={formValue.collegeName || ""}
            />
          )}
        </label>
        <label className="auth-field">
          <span>Notice Title</span>
          <input
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="Enter title"
            required
            type="text"
            value={formValue.title}
          />
        </label>
        <label className="auth-field">
          <span>Status</span>
          <select
            onChange={(event) => onChange("isPublished", event.target.value === "published")}
            value={formValue.isPublished ? "published" : "draft"}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
      </div>
      <label className="auth-field">
        <span>Content</span>
        <textarea
          className="panel-textarea"
          onChange={(event) => onChange("content", event.target.value)}
          placeholder="Details about notice..."
          required
          rows={3}
          value={formValue.content}
        />
      </label>
      <div className="panel-actions">
        <button className="auth-submit" disabled={submitting} type="submit">
          {isEditing ? "Update Notice" : "Create Notice"}
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
