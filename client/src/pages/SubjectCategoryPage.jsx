import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCollege } from "../college/CollegeContext";
import { SectionCard } from "../components/SectionCard";
import {
  getBranchById,
  getProgramById,
  getSemesterById,
  getSubjectById,
  subjectCategories
} from "../features/dashboard/data";
import { apiClient } from "../lib/apiClient";
import { useToast } from "../ui/ToastContext";

const initialUploadForm = {
  title: "",
  description: "",
  textContent: "",
  visibility: "private",
  accessPrice: "0",
  allowBasicSubscription: false
};

const initialEditForm = {
  title: "",
  description: "",
  textContent: "",
  visibility: "private",
  accessPrice: "0",
  allowBasicSubscription: false
};

function getStorageLabel(resource) {
  if (resource.storageProvider === "cloudflare-r2") {
    return "Cloudflare R2";
  }

  if (resource.storageProvider === "local") {
    return "Local Storage";
  }

  return resource.storageProvider || "Unknown";
}

function getAccessOptions(role) {
  if (role === "student") {
    return [
      {
        value: "personal",
        label: "Personal",
        description: "Only you can access this file."
      }
    ];
  }

  return [
    {
      value: "private",
      label: "Private",
      description: "Only students and staff from the same college can access it."
    },
    {
      value: "protected",
      label: "Protected",
      description: "Same college gets access, other colleges unlock by purchase or subscription."
    },
    {
      value: "public",
      label: "Public",
      description: "Anyone in the world can access this resource."
    },
    {
      value: "personal",
      label: "Personal",
      description: "Private workspace file visible only to the uploader."
    }
  ];
}

function ResourcePreview({ resource }) {
  if (resource.fileMimeType?.startsWith("video/")) {
    return <video className="resource-video" controls src={resource.previewUrl || resource.fileUrl} />;
  }

  if (resource.fileMimeType?.startsWith("audio/")) {
    return <audio className="resource-audio" controls src={resource.previewUrl || resource.fileUrl} />;
  }

  if (resource.fileMimeType?.startsWith("image/")) {
    return (
      <img
        alt={resource.title}
        className="resource-image"
        src={resource.previewUrl || resource.fileUrl}
      />
    );
  }

  if (resource.fileMimeType?.includes("pdf")) {
    return <iframe className="resource-pdf" src={resource.previewUrl || resource.fileUrl} title={resource.title} />;
  }

  if (resource.fileUrl) {
    return (
      <div className="resource-file-card">
        <p className="resource-badge">{resource.fileOriginalName || "Attached file"}</p>
        <p className="muted">{resource.fileMimeType || "Download to view this file type."}</p>
      </div>
    );
  }

  return null;
}

export function SubjectCategoryPage() {
  const { programId, branchId, semesterId, subjectId, categoryId } = useParams();
  const { user } = useAuth();
  const { selectedCollege } = useCollege();
  const { showError, showSuccess, showInfo } = useToast();
  const program = getProgramById(programId, selectedCollege?.name || "");
  const branch = getBranchById(program, branchId);
  const semester = getSemesterById(branch, semesterId);
  const fallbackSubject = getSubjectById(semester, subjectId);
  const category = subjectCategories.find((item) => item.id === categoryId);
  const [dynamicSubjects, setDynamicSubjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 8 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [uploadForm, setUploadForm] = useState(initialUploadForm);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [editingResourceId, setEditingResourceId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [feedbackByResource, setFeedbackByResource] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [feedbackBusyByResource, setFeedbackBusyByResource] = useState({});
  const isLectureCategory = categoryId === "lecture";

  const subject = useMemo(() => {
    const dynamicSubject = dynamicSubjects.find((item) => item.subjectId === subjectId);
    return dynamicSubject ? { id: dynamicSubject.subjectId, name: dynamicSubject.name } : fallbackSubject;
  }, [dynamicSubjects, fallbackSubject, subjectId]);

  const canUpload = useMemo(() => Boolean(user?.id), [user?.id]);
  const accessOptions = useMemo(() => getAccessOptions(user?.role), [user?.role]);

  const sortedResources = useMemo(() => {
    const items = [...resources];

    items.sort((left, right) => {
      if (sortBy === "title-asc") {
        return left.title.localeCompare(right.title);
      }

      if (sortBy === "uploader-asc") {
        return (left.uploadedBy?.fullName || left.uploadedBy?.email || "").localeCompare(
          right.uploadedBy?.fullName || right.uploadedBy?.email || ""
        );
      }

      if (sortBy === "file-first") {
        return Number(Boolean(right.fileUrl)) - Number(Boolean(left.fileUrl));
      }

      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });

    return items;
  }, [resources, sortBy]);

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

  async function loadResources(nextPage = 1) {
    if (!selectedCollege?.name) {
      setLoading(false);
      setResources([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/resources", {
        params: {
          collegeName: selectedCollege.name,
          programId,
          branchId,
          semesterId,
          subjectId,
          categoryId,
          page: nextPage,
          limit: pagination.limit,
          search: search.trim() || undefined
        }
      });

      const payload = response.data.data;
      setResources(payload.items || []);
      setPagination(payload.pagination || { page: 1, totalPages: 1, total: 0, limit: pagination.limit });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load resources.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResources(1);
  }, [selectedCollege?.name, programId, branchId, semesterId, subjectId, categoryId]);

  useEffect(() => {
    async function loadFeedbackSummary() {
      if (!resources.length || !user?.id) {
        setFeedbackByResource({});
        return;
      }

      const summaries = await Promise.all(
        resources.map(async (resource) => {
          try {
            const response = await apiClient.get("/ratings/summary", {
              params: {
                resourceType: "resource",
                resourceId: resource._id,
                commentLimit: 5
              }
            });
            return [resource._id, response.data.data];
          } catch {
            return [resource._id, null];
          }
        })
      );

      setFeedbackByResource(Object.fromEntries(summaries));
    }

    loadFeedbackSummary();
  }, [resources, user?.id]);

  if (!program || !branch || (!semester && !subject) || !subject || !category) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleUpload(event) {
    event.preventDefault();
    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("collegeName", selectedCollege?.name || "");
      formData.append("programId", programId);
      formData.append("branchId", branchId);
      formData.append("semesterId", semesterId);
      formData.append("subjectId", subjectId);
      formData.append("categoryId", categoryId);
      formData.append("title", uploadForm.title);
      formData.append("description", uploadForm.description);
      formData.append("textContent", uploadForm.textContent);
      formData.append("visibility", uploadForm.visibility);
      formData.append("accessPrice", uploadForm.accessPrice || "0");
      formData.append("allowBasicSubscription", String(uploadForm.allowBasicSubscription));

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      await apiClient.post("/resources/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setUploadForm(initialUploadForm);
      setSelectedFile(null);
      setSuccess("Resource uploaded successfully.");
      showSuccess("Resource uploaded successfully.");
      await loadResources(1);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to upload resource.";
      setError(message);
      showError(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(resourceId) {
    setError("");
    setSuccess("");

    try {
      await apiClient.delete(`/resources/${resourceId}`);
      setSuccess("Resource deleted.");
      if (editingResourceId === resourceId) {
        setEditingResourceId("");
        setEditForm(initialEditForm);
      }
      await loadResources(pagination.page);
      showInfo("Resource deleted.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete resource.";
      setError(message);
      showError(message);
    }
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    setSavingEdit(true);
    setError("");
    setSuccess("");

    try {
      await apiClient.patch(`/resources/${editingResourceId}`, editForm);
      setSuccess("Resource updated successfully.");
      showSuccess("Resource updated successfully.");
      setEditingResourceId("");
      setEditForm(initialEditForm);
      await loadResources(pagination.page);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to update resource.";
      setError(message);
      showError(message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleUnlockProtectedResource(resourceId) {
    setError("");
    setSuccess("");

    try {
      await apiClient.post(`/resources/${resourceId}/unlock`);
      showSuccess("Protected resource unlocked for your account.");
      await loadResources(pagination.page);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to unlock protected resource.";
      setError(message);
      showError(message);
    }
  }

  async function handleFeedbackVote(resourceId, vote, stars) {
    setFeedbackBusyByResource((current) => ({ ...current, [resourceId]: true }));
    setError("");

    try {
      await apiClient.post("/ratings", {
        resourceType: "resource",
        resourceId,
        vote,
        stars
      });
      const response = await apiClient.get("/ratings/summary", {
        params: { resourceType: "resource", resourceId, commentLimit: 5 }
      });
      setFeedbackByResource((current) => ({ ...current, [resourceId]: response.data.data }));
      showSuccess("Feedback saved.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to submit feedback.";
      setError(message);
      showError(message);
    } finally {
      setFeedbackBusyByResource((current) => ({ ...current, [resourceId]: false }));
    }
  }

  async function handleAddComment(resourceId) {
    const comment = String(commentInputs[resourceId] || "").trim();
    if (!comment) {
      return;
    }

    setFeedbackBusyByResource((current) => ({ ...current, [resourceId]: true }));
    setError("");

    try {
      await apiClient.post("/ratings/comments", {
        resourceType: "resource",
        resourceId,
        comment
      });
      setCommentInputs((current) => ({ ...current, [resourceId]: "" }));
      const response = await apiClient.get("/ratings/summary", {
        params: { resourceType: "resource", resourceId, commentLimit: 5 }
      });
      setFeedbackByResource((current) => ({ ...current, [resourceId]: response.data.data }));
      showSuccess("Comment posted.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to add comment.";
      setError(message);
      showError(message);
    } finally {
      setFeedbackBusyByResource((current) => ({ ...current, [resourceId]: false }));
    }
  }

  async function handleDeleteComment(resourceId, commentId) {
    setFeedbackBusyByResource((current) => ({ ...current, [resourceId]: true }));
    setError("");

    try {
      await apiClient.delete(`/ratings/comments/${commentId}`);
      const response = await apiClient.get("/ratings/summary", {
        params: { resourceType: "resource", resourceId, commentLimit: 5 }
      });
      setFeedbackByResource((current) => ({ ...current, [resourceId]: response.data.data }));
      showInfo("Comment deleted.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete comment.";
      setError(message);
      showError(message);
    } finally {
      setFeedbackBusyByResource((current) => ({ ...current, [resourceId]: false }));
    }
  }

  return (
    <div className="page-stack">
      <SectionCard
        title={`${category.label} Resources`}
        description={`${selectedCollege?.shortName || selectedCollege?.name || "College"} | ${subject.name}`}
      >
        <div className="detail-header">
          <div>
            <p className="program-badge">{program.name}</p>
            <h3>{subject.name}</h3>
            <p className="muted">{category.description}</p>
          </div>
          <Link className="back-link" to={`/dashboard/${programId}/branch/${branchId}/${semesterId}/${subjectId}`}>
            Back to categories
          </Link>
        </div>
      </SectionCard>

      {canUpload ? (
        <SectionCard
          title="Upload Content"
          description={
            isLectureCategory
              ? "Lecture category supports only video upload."
              : "Upload files with personal, private, protected, or public access visibility."
          }
        >
          {error ? <p className="auth-error">{error}</p> : null}
          {success ? <p className="success-note">{success}</p> : null}
          <form className="panel-form" onSubmit={handleUpload}>
            <label className="auth-field">
              <span>Title</span>
              <input
                onChange={(event) =>
                  setUploadForm((current) => ({ ...current, title: event.target.value }))
                }
                required
                type="text"
                value={uploadForm.title}
              />
            </label>
            <div className="auth-field">
              <span>Access Type</span>
              <div className="access-option-grid">
                {accessOptions.map((option) => (
                  <button
                    className={`access-option-card ${
                      uploadForm.visibility === option.value ? "selected" : ""
                    }`}
                    key={option.value}
                    onClick={() =>
                      setUploadForm((current) => ({ ...current, visibility: option.value }))
                    }
                    type="button"
                  >
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
            </div>
            {uploadForm.visibility === "protected" ? (
              <>
                <label className="auth-field">
                  <span>Protected Access Price</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      setUploadForm((current) => ({ ...current, accessPrice: event.target.value }))
                    }
                    step="0.01"
                    type="number"
                    value={uploadForm.accessPrice}
                  />
                </label>
                <label className="auth-field checkbox-field">
                  <span>Allow Basic Subscription Access</span>
                  <input
                    checked={uploadForm.allowBasicSubscription}
                    onChange={(event) =>
                      setUploadForm((current) => ({
                        ...current,
                        allowBasicSubscription: event.target.checked
                      }))
                    }
                    type="checkbox"
                  />
                </label>
              </>
            ) : null}
            <label className="auth-field">
              <span>Description</span>
              <input
                onChange={(event) =>
                  setUploadForm((current) => ({ ...current, description: event.target.value }))
                }
                type="text"
                value={uploadForm.description}
              />
            </label>
            {!isLectureCategory ? (
              <label className="auth-field">
                <span>Text Content (optional)</span>
                <textarea
                  className="panel-textarea"
                  onChange={(event) =>
                    setUploadForm((current) => ({ ...current, textContent: event.target.value }))
                  }
                  rows={4}
                  value={uploadForm.textContent}
                />
              </label>
            ) : null}
            <label className="auth-field">
              <span>{isLectureCategory ? "Video Upload (required)" : "File Upload (optional)"}</span>
              <input
                accept={isLectureCategory ? "video/*" : undefined}
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                required={isLectureCategory}
                type="file"
              />
            </label>
            <button className="auth-submit" disabled={uploading} type="submit">
              {uploading ? "Uploading..." : "Upload Resource"}
            </button>
          </form>
        </SectionCard>
      ) : null}

      {editingResourceId ? (
        <SectionCard title="Edit Resource" description="Update the uploaded resource metadata.">
          <form className="panel-form" onSubmit={handleSaveEdit}>
            <label className="auth-field">
              <span>Title</span>
              <input
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, title: event.target.value }))
                }
                required
                type="text"
                value={editForm.title}
              />
            </label>
            <label className="auth-field">
              <span>Description</span>
              <input
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, description: event.target.value }))
                }
                type="text"
                value={editForm.description}
              />
            </label>
            <div className="auth-field">
              <span>Access Type</span>
              <div className="access-option-grid">
                {accessOptions.map((option) => (
                  <button
                    className={`access-option-card ${
                      editForm.visibility === option.value ? "selected" : ""
                    }`}
                    key={option.value}
                    onClick={() =>
                      setEditForm((current) => ({ ...current, visibility: option.value }))
                    }
                    type="button"
                  >
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
            </div>
            {editForm.visibility === "protected" ? (
              <>
                <label className="auth-field">
                  <span>Protected Access Price</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, accessPrice: event.target.value }))
                    }
                    step="0.01"
                    type="number"
                    value={editForm.accessPrice}
                  />
                </label>
                <label className="auth-field checkbox-field">
                  <span>Allow Basic Subscription Access</span>
                  <input
                    checked={Boolean(editForm.allowBasicSubscription)}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        allowBasicSubscription: event.target.checked
                      }))
                    }
                    type="checkbox"
                  />
                </label>
              </>
            ) : null}
            {!isLectureCategory ? (
              <label className="auth-field">
                <span>Text Content</span>
                <textarea
                  className="panel-textarea"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, textContent: event.target.value }))
                  }
                  rows={4}
                  value={editForm.textContent}
                />
              </label>
            ) : null}
            <div className="panel-actions">
              <button className="auth-submit" disabled={savingEdit} type="submit">
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
              <button
                className="action-button neutral"
                onClick={() => {
                  setEditingResourceId("");
                  setEditForm(initialEditForm);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard title="Available Resources" description="View online or download resources.">
        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, description, text..."
            type="text"
            value={search}
          />
          <select
            className="college-search"
            onChange={(event) => setSortBy(event.target.value)}
            value={sortBy}
          >
            <option value="newest">Sort by newest</option>
            <option value="title-asc">Sort by title</option>
            <option value="uploader-asc">Sort by uploader</option>
            <option value="file-first">Show file uploads first</option>
          </select>
          <button className="open-college-button" onClick={() => loadResources(1)} type="button">
            Search
          </button>
        </div>
        <div className="stat-grid compact-stat-grid">
          <article className="stat-card">
            <p className="stat-label">Visible Resources</p>
            <h3>{sortedResources.length}</h3>
            <p className="muted">Current page results</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Page Total</p>
            <h3>{pagination.total}</h3>
            <p className="muted">Across all pages</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Upload Access</p>
            <h3>{canUpload ? "Enabled" : "View Only"}</h3>
            <p className="muted">{canUpload ? "You can manage this category" : "Read and download access"}</p>
          </article>
        </div>

        {loading ? <p className="muted">Loading resources...</p> : null}
        {!loading && resources.length === 0 ? (
          <p className="muted">No resources uploaded in this category yet.</p>
        ) : null}
        <div className="panel-list">
          {sortedResources.map((resource) => {
            const canManage = user?.role === "admin" || resource.uploadedBy?._id === user?.id;
            const feedback = feedbackByResource[resource._id];
            const feedbackMetrics = feedback?.metrics || {
              averageStars: 0,
              totalRatings: 0,
              upvotes: 0,
              downvotes: 0,
              comments: 0
            };
            const myFeedback = feedback?.myRating || { stars: 0, vote: "neutral" };
            const comments = feedback?.comments || [];
            const feedbackBusy = Boolean(feedbackBusyByResource[resource._id]);

            return (
              <article className="panel-card" key={resource._id}>
                <h3>{resource.title}</h3>
                <p className="muted">
                  Uploaded by: {resource.uploadedBy?.fullName || "Unknown"} ({resource.uploadedBy?.role})
                </p>
                <p className="muted">
                  Access: {resource.visibility || "private"}
                  {resource.visibility === "protected"
                    ? ` | Unlock price: INR ${resource.accessPrice || 0}${resource.allowBasicSubscription ? " | Basic subscription allowed" : ""}`
                    : ""}
                </p>
                <p className="muted">Storage: {getStorageLabel(resource)}</p>
                {resource.description ? <p className="muted">{resource.description}</p> : null}
                {resource.textContent ? <pre className="resource-text">{resource.textContent}</pre> : null}

                <ResourcePreview resource={resource} />

                <div className="resource-file-card">
                  <p className="resource-badge">
                    Rating {feedbackMetrics.averageStars}/5 ({feedbackMetrics.totalRatings})
                  </p>
                  <p className="muted">
                    Upvotes: {feedbackMetrics.upvotes} | Downvotes: {feedbackMetrics.downvotes} | Comments:{" "}
                    {feedbackMetrics.comments}
                  </p>
                  <div className="panel-actions">
                    <button
                      className="action-button approve"
                      disabled={feedbackBusy}
                      onClick={() => handleFeedbackVote(resource._id, "upvote", myFeedback.stars || 0)}
                      type="button"
                    >
                      Upvote
                    </button>
                    <button
                      className="action-button reject"
                      disabled={feedbackBusy}
                      onClick={() => handleFeedbackVote(resource._id, "downvote", myFeedback.stars || 0)}
                      type="button"
                    >
                      Downvote
                    </button>
                    <select
                      className="college-search"
                      disabled={feedbackBusy}
                      onChange={(event) =>
                        handleFeedbackVote(resource._id, myFeedback.vote || "neutral", Number(event.target.value))
                      }
                      value={myFeedback.stars || 0}
                    >
                      <option value={0}>Rate (0-5)</option>
                      <option value={1}>1 Star</option>
                      <option value={2}>2 Stars</option>
                      <option value={3}>3 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={5}>5 Stars</option>
                    </select>
                  </div>
                  <div className="auth-field">
                    <span>{resource.categoryId === "lecture" ? "Video comments" : "Comments"}</span>
                    <textarea
                      className="panel-textarea"
                      onChange={(event) =>
                        setCommentInputs((current) => ({
                          ...current,
                          [resource._id]: event.target.value
                        }))
                      }
                      placeholder="Write your comment..."
                      rows={2}
                      value={commentInputs[resource._id] || ""}
                    />
                  </div>
                  <button
                    className="open-college-button"
                    disabled={feedbackBusy}
                    onClick={() => handleAddComment(resource._id)}
                    type="button"
                  >
                    {feedbackBusy ? "Submitting..." : "Post Comment"}
                  </button>
                  {comments.length ? (
                    <div className="panel-list">
                      {comments.map((comment) => {
                        const canDeleteComment =
                          user?.role === "admin" || String(comment.user?._id) === String(user?.id);
                        return (
                          <article className="panel-card" key={comment._id}>
                            <p className="muted">
                              {comment.user?.fullName || "User"} ({comment.user?.role || "student"}) |{" "}
                              {new Date(comment.createdAt).toLocaleString()}
                            </p>
                            <p>{comment.comment}</p>
                            {canDeleteComment ? (
                              <button
                                className="action-button reject"
                                onClick={() => handleDeleteComment(resource._id, comment._id)}
                                type="button"
                              >
                                Delete Comment
                              </button>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="muted">
                      {resource.categoryId === "lecture"
                        ? "No video comments yet."
                        : "No comments yet for this resource."}
                    </p>
                  )}
                </div>

                <div className="panel-actions">
                  {resource.fileUrl ? (
                    <a
                      className="open-college-button"
                      href={`${apiClient.defaults.baseURL}/resources/${resource._id}/download`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Download
                    </a>
                  ) : null}
                  {resource.visibility === "protected" &&
                  resource.uploadedBy?._id !== user?.id &&
                  user?.role !== "admin" ? (
                    <button
                      className="action-button neutral"
                      onClick={() => handleUnlockProtectedResource(resource._id)}
                      type="button"
                    >
                      Unlock Protected
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      className="action-button approve"
                      onClick={() => {
                        setEditingResourceId(resource._id);
                        setEditForm({
                          title: resource.title,
                          description: resource.description || "",
                          textContent: resource.textContent || "",
                          visibility: resource.visibility || "private",
                          accessPrice: String(resource.accessPrice || 0),
                          allowBasicSubscription: Boolean(resource.allowBasicSubscription)
                        });
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      className="action-button reject"
                      onClick={() => handleDelete(resource._id)}
                      type="button"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <div className="pagination-bar">
          <button
            className="open-college-button"
            disabled={pagination.page <= 1}
            onClick={() => loadResources(pagination.page - 1)}
            type="button"
          >
            Previous
          </button>
          <p className="muted">
            Page {pagination.page} of {pagination.totalPages} | Total {pagination.total}
          </p>
          <button
            className="open-college-button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => loadResources(pagination.page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
