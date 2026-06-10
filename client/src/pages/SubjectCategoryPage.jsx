import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useNavigate } from "react-router-dom";
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
import { getDynamicBranchById, getDynamicProgramById, groupStructuresIntoPrograms } from "../lib/academicHelpers";
import { apiClient, buildAuthorizedApiUrl } from "../lib/apiClient";
import { requestDeletePassword } from "../lib/deleteWithPassword";
import { openRazorpayCheckout } from "../lib/paymentClient";
import { useToast } from "../ui/ToastContext";
import { SkeletonCard, Spinner } from "../components/LoadingStates";

const CATEGORY_UPLOAD_GUIDANCE = {
  lecture: {
    accepts: "video/*",
    heading: "Allowed format",
    detail: "Upload video files only."
  },
  "pdf-ppt": {
    accepts: ".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    heading: "Allowed formats",
    detail: "PDF, PPT, and PPTX files only."
  },
  books: {
    accepts: ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    heading: "Allowed formats",
    detail: "PDF, DOC, and DOCX files. Text-only notes are also allowed."
  },
  "class-notes": {
    accepts: ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*",
    heading: "Allowed formats",
    detail: "PDF, DOC, DOCX, and text files. You can also add text directly."
  },
  lab: {
    accepts: ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*",
    heading: "Allowed formats",
    detail: "PDF, DOC, DOCX, and text files. You can also add text directly."
  },
  pyq: {
    accepts: ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*",
    heading: "Allowed formats",
    detail: "PDF and image files only."
  },
  notice: {
    accepts: ".pdf,.jpg,.jpeg,.png,.webp,.txt,application/pdf,image/*,text/*",
    heading: "Allowed formats",
    detail: "PDF, image, and text files. You can also add text directly."
  },
  syllabus: {
    accepts: ".pdf,.doc,.docx,.txt,application/pdf,application/msword,text/*",
    heading: "Allowed formats",
    detail: "PDF, DOC, DOCX, and text files. You can also add text directly."
  },
  suggestion: {
    accepts: ".pdf,.txt,application/pdf,text/*",
    heading: "Allowed formats",
    detail: "PDF and text files. You can also add text directly."
  }
};

const initialUploadForm = {
  title: "",
  description: "",
  textContent: "",
  visibility: "private",
  accessPrice: "0",
  allowBasicSubscription: false,
  externalLink: ""
};

const initialEditForm = {
  title: "",
  description: "",
  textContent: "",
  visibility: "private",
  accessPrice: "0",
  allowBasicSubscription: false,
  externalLink: ""
};

function getStorageLabel(resource) {
  if (resource.storageProvider === "cloudflare-r2") {
    return "Cloudflare R2";
  }

  if (resource.storageProvider === "local") {
    return "Local Storage";
  }

  if (resource.storageProvider === "cloudinary") {
    return "Cloudinary Storage";
  }

  if (resource.storageProvider === "external") {
    return "External Link";
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

function ResourcePreview({ resource, onAccessAttempt }) {
  if (resource.isLocked) {
    return (
      <div className="locked-preview-card" onClick={onAccessAttempt}>
        <div className="locked-preview-icon">🔒</div>
        <h4>Resource Locked</h4>
        <p className="muted">This resource is private/protected. Sign in or unlock to view the content.</p>
        <button className="open-college-button compact" type="button">Access Resource</button>
      </div>
    );
  }

  const previewSrc = buildAuthorizedApiUrl(resource.previewUrl || resource.fileUrl);

  if (resource.fileMimeType?.startsWith("video/")) {
    return <video className="resource-video" controls src={previewSrc} />;
  }

  if (resource.fileMimeType?.startsWith("audio/")) {
    return <audio className="resource-audio" controls src={previewSrc} />;
  }

  if (resource.fileMimeType?.startsWith("image/")) {
    return (
      <img
        alt={resource.title}
        className="resource-image"
        src={previewSrc}
      />
    );
  }

  if (resource.storageProvider === "external") {
    return (
      <div className="resource-file-card">
        <p className="resource-badge">External Resource Link</p>
        <p className="muted">{resource.fileUrl}</p>
      </div>
    );
  }

  if (resource.fileMimeType?.includes("pdf")) {
    return <iframe className="resource-pdf" src={previewSrc} title={resource.title} />;
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

function humanizeSlug(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SubjectCategoryPage() {
  const { programId, branchId, semesterId, subjectId, categoryId } = useParams();
  const { user } = useAuth();
  const { selectedCollege } = useCollege();
  const { showError, showSuccess, showInfo } = useToast();
  const navigate = useNavigate();
  const fallbackProgram = getProgramById(programId, selectedCollege?.name || "");
  const fallbackBranch = getBranchById(fallbackProgram, branchId);
  const fallbackSemester = getSemesterById(fallbackBranch, semesterId);
  const fallbackSubject = getSubjectById(fallbackSemester, subjectId);
  const category = subjectCategories.find((item) => item.id === categoryId);
  const [dynamicPrograms, setDynamicPrograms] = useState([]);
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
  const [structureLoaded, setStructureLoaded] = useState(false);
  const isLectureCategory = categoryId === "lecture";

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

  const subject = useMemo(() => {
    const dynamicSubject = dynamicSubjects.find((item) => item.subjectId === subjectId);
    if (dynamicSubject) {
      return { id: dynamicSubject.subjectId, name: dynamicSubject.name };
    }

    if (!dynamicSubjects.length) {
      return fallbackSubject;
    }

    return null;
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
        return (left.uploadedBy?.fullName || "").localeCompare(right.uploadedBy?.fullName || "");
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
  const programName = program?.name || humanizeSlug(programId);
  const branchName = branch?.name || humanizeSlug(branchId);
  const semesterName = semester?.semester || humanizeSlug(semesterId);
  const resolvedSubject = subject || {
    id: subjectId,
    name: humanizeSlug(subjectId)
  };
  const uploadGuidance = CATEGORY_UPLOAD_GUIDANCE[categoryId] || {
    accepts: undefined,
    heading: "Allowed formats",
    detail: "This category accepts the supported upload types configured for the platform."
  };

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

  if (!structureLoaded) {
    return (
      <div className="page-stack">
        <SectionCard title="Loading category workspace" description="Fetching branch, semester, and subject context.">
          <p className="muted">Loading resource category...</p>
        </SectionCard>
      </div>
    );
  }

  if (!selectedCollege?.name || !category) {
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
      formData.append("externalLink", uploadForm.externalLink || "");

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
    const currentPassword = requestDeletePassword("this resource");
    if (!currentPassword) {
      return;
    }
    setError("");
    setSuccess("");

    try {
      await apiClient.delete(`/resources/${resourceId}`, { data: { currentPassword } });
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

  function handleAccessAttempt(resource) {
    if (!user) {
      navigate("/login", { state: { from: window.location.pathname } });
      showInfo("Please sign in or register to access resources and features.");
      return;
    }

    if (resource.visibility === "protected") {
      handleUnlockProtectedResource(resource._id);
    }
  }

  async function handleUnlockProtectedResource(resourceId) {
    if (!user) {
      navigate("/login", { state: { from: window.location.pathname } });
      showInfo("Please sign in or register to access resources and features.");
      return;
    }
    setError("");
    setSuccess("");

    try {
      const response = await apiClient.post(`/resources/${resourceId}/unlock`);

      if (response.data.paymentRequired && response.data.data?.checkout) {
        await openRazorpayCheckout({
          checkout: response.data.data.checkout,
          onSuccess: async (paymentResponse) => {
            const verifyResponse = await apiClient.post(
              `/resources/${resourceId}/verify-unlock-payment`,
              {
                paymentOrderId: response.data.data.paymentOrderId,
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature
              }
            );
            setSuccess(verifyResponse.data.message || "Protected resource unlocked successfully.");
            showSuccess(verifyResponse.data.message || "Protected resource unlocked successfully.");
            await loadResources(pagination.page);
          },
          onDismiss: () => {
            const message = "Payment window closed. You can try unlocking again anytime.";
            setSuccess(message);
            showInfo(message);
          }
        });
        return;
      }

      setSuccess(response.data.message || "Protected resource unlocked for your account.");
      showSuccess(response.data.message || "Protected resource unlocked for your account.");
      await loadResources(pagination.page);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to unlock protected resource.";
      setError(message);
      showError(message);
    }
  }

  async function handleFeedbackVote(resourceId, vote, stars) {
    if (!user) {
      navigate("/login", { state: { from: window.location.pathname } });
      showInfo("Please sign in or register to access resources and features.");
      return;
    }
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
    if (!user) {
      navigate("/login", { state: { from: window.location.pathname } });
      showInfo("Please sign in or register to access resources and features.");
      return;
    }
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
    const currentPassword = requestDeletePassword("this comment");
    if (!currentPassword) {
      return;
    }
    setFeedbackBusyByResource((current) => ({ ...current, [resourceId]: true }));
    setError("");

    try {
      await apiClient.delete(`/ratings/comments/${commentId}`, {
        data: { currentPassword }
      });
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
        description={`${selectedCollege?.shortName || selectedCollege?.name || "College"} | ${resolvedSubject.name}`}
      >
        <div className="detail-header">
          <div>
            <p className="program-badge">{programName}</p>
            <h3>{resolvedSubject.name}</h3>
            <p className="muted">
              {branchName} | {semesterName}
            </p>
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
            <div
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "20px",
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                color: "#ef4444"
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20" style={{ flexShrink: 0, marginTop: "2px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <div>
                <strong style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>Copyright & Intellectual Property Warning</strong>
                <span style={{ fontSize: "0.85rem", opacity: 0.9, lineHeight: "1.4", display: "block" }}>
                  Please do NOT upload copyrighted textbooks, published papers, or third-party paid course materials. You are only permitted to upload student-created lecture notes, lab records, slides, or previous year questions (PYQs). Uploading copyrighted materials violates our platform policy and will result in instant account suspension.
                </span>
              </div>
            </div>

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
              <span>External Link (URL)</span>
              <p className="muted">Provide a link to YouTube, Google Drive, or any external academic resource.</p>
              <input
                type="url"
                placeholder="https://example.com/resource"
                value={uploadForm.externalLink}
                onChange={(event) =>
                  setUploadForm((current) => ({ ...current, externalLink: event.target.value }))
                }
              />
            </label>
            <label className="auth-field">
              <span>{isLectureCategory ? "Video Upload" : "File Upload (optional)"}</span>
              <p className="muted">
                {uploadGuidance.heading}: {uploadGuidance.detail} {isLectureCategory ? "(Required if no external link provided)" : ""}
              </p>
              <input
                accept={uploadGuidance.accepts}
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                required={isLectureCategory && !uploadForm.externalLink}
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
            {editForm.externalLink ? (
              <label className="auth-field">
                <span>External Link (URL)</span>
                <input
                  type="url"
                  placeholder="https://example.com/resource"
                  value={editForm.externalLink}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, externalLink: event.target.value }))
                  }
                  required
                />
              </label>
            ) : null}
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

        {!loading && resources.length === 0 ? (
          <p className="muted">No resources uploaded in this category yet.</p>
        ) : null}
        <div className="panel-list">
          {loading ? (
            <SkeletonCard count={3} />
          ) : (
            sortedResources.map((resource) => {
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

                <ResourcePreview resource={resource} onAccessAttempt={() => handleAccessAttempt(resource)} />

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
                      href={buildAuthorizedApiUrl(
                        `${apiClient.defaults.baseURL}/resources/${resource._id}/download`
                      )}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {resource.storageProvider === "external" ? "Open Link" : "Download"}
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
                          allowBasicSubscription: Boolean(resource.allowBasicSubscription),
                          externalLink: resource.storageProvider === "external" ? resource.fileUrl : ""
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
          })
        )}
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
