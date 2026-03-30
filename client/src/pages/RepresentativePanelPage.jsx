import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { apiClient } from "../lib/apiClient";

const initialForm = {
  collegeName: "",
  courseName: "",
  semesterCount: 8
};

const initialProfileForm = {
  collegeName: "",
  entranceExams: "",
  nirf: "",
  qs: "",
  otherRanking: "",
  cutOffSummary: "",
  placementReport: "",
  placementReportUrl: "",
  averagePackageLpa: "",
  highestPackageLpa: ""
};

const initialNoticeForm = {
  collegeName: "",
  title: "",
  content: "",
  isPublished: true
};

const initialQuizQuestion = {
  prompt: "",
  options: ["", "", "", ""],
  answer: ""
};

const initialQuizForm = {
  collegeName: "",
  title: "",
  duration: "",
  difficulty: "Medium",
  mode: "",
  note: "",
  resourceMatch: "",
  isPublished: true,
  questions: [initialQuizQuestion]
};

function mapProfileToForm(profile) {
  if (!profile) {
    return initialProfileForm;
  }

  return {
    collegeName: profile.collegeName || "",
    entranceExams: Array.isArray(profile.entranceExams) ? profile.entranceExams.join(", ") : "",
    nirf: profile.rankings?.nirf || "",
    qs: profile.rankings?.qs || "",
    otherRanking: profile.rankings?.other || "",
    cutOffSummary: profile.cutOffSummary || "",
    placementReport: profile.placementReport || "",
    placementReportUrl: profile.placementReportUrl || "",
    averagePackageLpa: profile.averagePackageLpa || "",
    highestPackageLpa: profile.highestPackageLpa || ""
  };
}

function mapQuizToForm(quiz) {
  if (!quiz) {
    return initialQuizForm;
  }

  return {
    collegeName: quiz.collegeName || "",
    title: quiz.title || "",
    duration: quiz.duration || "",
    difficulty: quiz.difficulty || "Medium",
    mode: quiz.mode || "",
    note: quiz.note || "",
    resourceMatch: quiz.resourceMatch || "",
    isPublished: Boolean(quiz.isPublished),
    questions:
      Array.isArray(quiz.questions) && quiz.questions.length
        ? quiz.questions.map((question) => ({
            prompt: question.prompt || "",
            options: Array.isArray(question.options)
              ? [...question.options, "", "", "", ""].slice(0, 4)
              : ["", "", "", ""],
            answer: question.answer || ""
          }))
        : [initialQuizQuestion]
  };
}

export function RepresentativePanelPage() {
  const [form, setForm] = useState(initialForm);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [requests, setRequests] = useState([]);
  const [myColleges, setMyColleges] = useState([]);
  const [notices, setNotices] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [noticeSubmitting, setNoticeSubmitting] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState("");
  const [editingProfileId, setEditingProfileId] = useState("");
  const [editingNoticeId, setEditingNoticeId] = useState("");
  const [editingQuizId, setEditingQuizId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [collegeSearch, setCollegeSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState("all");
  const [collegeSort, setCollegeSort] = useState("college-asc");
  const [noticeForm, setNoticeForm] = useState(initialNoticeForm);
  const [noticeSearch, setNoticeSearch] = useState("");
  const [quizForm, setQuizForm] = useState(initialQuizForm);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizSearch, setQuizSearch] = useState("");

  async function loadRepresentativeData() {
    setLoading(true);
    setError("");

    try {
      const [requestsResponse, collegesResponse] = await Promise.all([
        apiClient.get("/governance/requests/my"),
        apiClient.get("/governance/approved-courses/my")
      ]);

      setRequests(requestsResponse.data.data);
      const collegeItems = collegesResponse.data.data || [];
      setMyColleges(collegeItems);

      const collegeNames = [...new Set(collegeItems.map((item) => item.collegeName).filter(Boolean))];
      if (collegeNames.length) {
        const [noticeResponses, quizResponses] = await Promise.all([
          Promise.all(
          collegeNames.map((collegeName) =>
            apiClient.get("/notices", {
              params: { collegeName, includeUnpublished: true }
            })
          )
          ),
          Promise.all(
            collegeNames.map((collegeName) =>
              apiClient.get("/quizzes", {
                params: { collegeName, includeUnpublished: true }
              })
            )
          )
        ]);
        const allNotices = noticeResponses.flatMap((response) => response.data.data || []);
        const uniqueNotices = Array.from(new Map(allNotices.map((item) => [item._id, item])).values());
        setNotices(uniqueNotices);
        const allQuizzes = quizResponses.flatMap((response) => response.data.data || []);
        const uniqueQuizzes = Array.from(new Map(allQuizzes.map((item) => [item._id, item])).values());
        setQuizzes(uniqueQuizzes);
      } else {
        setNotices([]);
        setQuizzes([]);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Failed to load your representative data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRepresentativeData();
  }, []);

  function resetCourseForm() {
    setForm(initialForm);
    setEditingCourseId("");
  }

  function resetProfileForm() {
    setProfileForm(initialProfileForm);
    setEditingProfileId("");
  }

  function resetNoticeForm() {
    setNoticeForm(initialNoticeForm);
    setEditingNoticeId("");
  }

  function resetQuizForm() {
    setQuizForm(initialQuizForm);
    setEditingQuizId("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        semesterCount: Number(form.semesterCount)
      };

      if (editingCourseId) {
        await apiClient.patch(`/governance/approved-courses/${editingCourseId}`, payload);
        setSuccess("College course details updated successfully.");
      } else {
        await apiClient.post("/governance/requests", payload);
        setSuccess("Request submitted for admin verification.");
      }

      resetCourseForm();
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save college course details.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await apiClient.put("/governance/college-profile", {
        collegeName: profileForm.collegeName,
        entranceExams: profileForm.entranceExams,
        rankings: {
          nirf: profileForm.nirf,
          qs: profileForm.qs,
          other: profileForm.otherRanking
        },
        cutOffSummary: profileForm.cutOffSummary,
        placementReport: profileForm.placementReport,
        placementReportUrl: profileForm.placementReportUrl,
        averagePackageLpa: profileForm.averagePackageLpa,
        highestPackageLpa: profileForm.highestPackageLpa
      });

      setSuccess(editingProfileId ? "College profile updated successfully." : "College profile saved successfully.");
      resetProfileForm();
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save college profile.");
    } finally {
      setProfileSubmitting(false);
    }
  }

  function handleEditCourse(course) {
    setError("");
    setSuccess("");
    setEditingCourseId(course._id);
    setForm({
      collegeName: course.collegeName,
      courseName: course.courseName,
      semesterCount: course.semesterCount
    });
  }

  function handleEditProfile(profile) {
    setError("");
    setSuccess("");
    setEditingProfileId(profile._id);
    setProfileForm(mapProfileToForm(profile));
  }

  async function handleDeleteCourse(course) {
    const shouldDelete = window.confirm(
      `Delete ${course.courseName} from ${course.collegeName}? This will remove the approved college-course entry from your account.`
    );

    if (!shouldDelete) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiClient.delete(`/governance/approved-courses/${course._id}`);
      if (editingCourseId === course._id) {
        resetCourseForm();
      }
      if (editingProfileId && course.profile?._id === editingProfileId) {
        resetProfileForm();
      }
      setSuccess(response.data.message || "College course deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete college course.");
    }
  }

  async function handleDeleteProfile(profile) {
    const shouldDelete = window.confirm(`Delete the profile details for ${profile.collegeName}?`);

    if (!shouldDelete) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiClient.delete(`/governance/college-profile/${profile._id}`);
      if (editingProfileId === profile._id) {
        resetProfileForm();
      }
      setSuccess(response.data.message || "College profile deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete college profile.");
    }
  }

  async function handleNoticeSubmit(event) {
    event.preventDefault();
    setNoticeSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (editingNoticeId) {
        await apiClient.patch(`/notices/${editingNoticeId}`, noticeForm);
        setSuccess("Notice updated successfully.");
      } else {
        await apiClient.post("/notices", noticeForm);
        setSuccess("Notice created successfully.");
      }

      resetNoticeForm();
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save notice.");
    } finally {
      setNoticeSubmitting(false);
    }
  }

  function handleEditNotice(notice) {
    setEditingNoticeId(notice._id);
    setNoticeForm({
      collegeName: notice.collegeName || "",
      title: notice.title || "",
      content: notice.content || "",
      isPublished: Boolean(notice.isPublished)
    });
    setError("");
    setSuccess("");
  }

  async function handleDeleteNotice(noticeId) {
    setError("");
    setSuccess("");

    try {
      await apiClient.delete(`/notices/${noticeId}`);
      if (editingNoticeId === noticeId) {
        resetNoticeForm();
      }
      setSuccess("Notice deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete notice.");
    }
  }

  function handleQuizQuestionChange(questionIndex, key, value) {
    setQuizForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex ? { ...question, [key]: value } : question
      )
    }));
  }

  function handleQuizOptionChange(questionIndex, optionIndex, value) {
    setQuizForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, idx) => (idx === optionIndex ? value : option))
            }
          : question
      )
    }));
  }

  function addQuizQuestion() {
    setQuizForm((current) => ({
      ...current,
      questions: [...current.questions, { ...initialQuizQuestion, options: [...initialQuizQuestion.options] }]
    }));
  }

  function removeQuizQuestion(questionIndex) {
    setQuizForm((current) => ({
      ...current,
      questions:
        current.questions.length === 1
          ? current.questions
          : current.questions.filter((_, index) => index !== questionIndex)
    }));
  }

  async function handleQuizSubmit(event) {
    event.preventDefault();
    setQuizSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...quizForm,
        questions: quizForm.questions.map((question) => ({
          prompt: question.prompt,
          options: question.options.filter((option) => option.trim()),
          answer: question.answer
        }))
      };

      if (editingQuizId) {
        await apiClient.patch(`/quizzes/${editingQuizId}`, payload);
        setSuccess("Quiz arrangement updated successfully.");
      } else {
        await apiClient.post("/quizzes", payload);
        setSuccess("Quiz arrangement created successfully.");
      }

      resetQuizForm();
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save quiz arrangement.");
    } finally {
      setQuizSubmitting(false);
    }
  }

  function handleEditQuiz(quiz) {
    setEditingQuizId(quiz._id);
    setQuizForm(mapQuizToForm(quiz));
    setError("");
    setSuccess("");
  }

  async function handleDeleteQuiz(quizId) {
    setError("");
    setSuccess("");

    try {
      await apiClient.delete(`/quizzes/${quizId}`);
      if (editingQuizId === quizId) {
        resetQuizForm();
      }
      setSuccess("Quiz arrangement deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete quiz arrangement.");
    }
  }

  const filteredColleges = useMemo(() => {
    const term = collegeSearch.trim().toLowerCase();
    const items = myColleges.filter((item) => {
      if (!term) {
        return true;
      }

      return (
        item.collegeName.toLowerCase().includes(term) ||
        item.courseName.toLowerCase().includes(term) ||
        (item.profile?.entranceExams || []).join(", ").toLowerCase().includes(term)
      );
    });

    items.sort((left, right) => {
      if (collegeSort === "semester-desc") {
        return right.semesterCount - left.semesterCount;
      }

      if (collegeSort === "course-asc") {
        return left.courseName.localeCompare(right.courseName);
      }

      return left.collegeName.localeCompare(right.collegeName);
    });

    return items;
  }, [collegeSearch, collegeSort, myColleges]);

  const filteredRequests = useMemo(() => {
    const term = requestSearch.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesFilter = requestFilter === "all" ? true : request.status === requestFilter;
      const matchesSearch =
        !term ||
        request.collegeName.toLowerCase().includes(term) ||
        request.courseName.toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [requestFilter, requestSearch, requests]);

  const filteredNotices = useMemo(() => {
    const term = noticeSearch.trim().toLowerCase();

    return notices.filter((notice) => {
      if (!term) {
        return true;
      }

      return (
        notice.title?.toLowerCase().includes(term) ||
        notice.content?.toLowerCase().includes(term) ||
        (notice.collegeName || "").toLowerCase().includes(term)
      );
    });
  }, [noticeSearch, notices]);

  const filteredQuizzes = useMemo(() => {
    const term = quizSearch.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      if (!term) {
        return true;
      }

      return (
        quiz.title?.toLowerCase().includes(term) ||
        quiz.mode?.toLowerCase().includes(term) ||
        quiz.difficulty?.toLowerCase().includes(term) ||
        (quiz.collegeName || "").toLowerCase().includes(term)
      );
    });
  }, [quizSearch, quizzes]);

  const stats = useMemo(
    () => [
      {
        label: "Approved Colleges",
        value: myColleges.length,
        note: "Editable from this panel"
      },
      {
        label: "Pending Requests",
        value: requests.filter((request) => request.status === "pending").length,
        note: "Awaiting admin decision"
      },
      {
        label: "Profiles Added",
        value: myColleges.filter((item) => item.profile).length,
        note: "Visible on dashboard"
      },
      {
        label: "Visible Search Results",
        value: filteredColleges.length,
        note: "Based on your current filter"
      }
    ],
    [filteredColleges.length, myColleges, requests]
  );

  return (
    <div className="page-stack">
      <SectionCard
        title="Representative Panel"
        description="Submit new college-course requests and manage only the colleges approved under your account."
      >
        {error ? <p className="auth-error">{error}</p> : null}
        {success ? <p className="success-note">{success}</p> : null}
        <div className="stat-grid">
          {stats.map((item) => (
            <article className="stat-card" key={item.label}>
              <p className="stat-label">{item.label}</p>
              <h3>{item.value}</h3>
              <p className="muted">{item.note}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="College Request Form"
        description="Create a new approval request or update one of your approved course entries."
      >
        <form className="panel-form" onSubmit={handleSubmit}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>College Name</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, collegeName: event.target.value }))}
                required
                type="text"
                value={form.collegeName}
              />
            </label>
            <label className="auth-field">
              <span>Course Name</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, courseName: event.target.value }))}
                required
                type="text"
                value={form.courseName}
              />
            </label>
            <label className="auth-field">
              <span>Semester Count</span>
              <input
                max="12"
                min="1"
                onChange={(event) =>
                  setForm((current) => ({ ...current, semesterCount: event.target.value }))
                }
                required
                type="number"
                value={form.semesterCount}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button className="auth-submit" disabled={submitting} type="submit">
              {submitting
                ? editingCourseId
                  ? "Updating..."
                  : "Submitting..."
                : editingCourseId
                  ? "Update College Course"
                  : "Submit For Approval"}
            </button>
            {editingCourseId ? (
              <button className="action-button neutral" onClick={resetCourseForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="College Detail Entry"
        description="Add exam, ranking, cut-off, and placement details for your own approved colleges."
      >
        <form className="panel-form" onSubmit={handleProfileSubmit}>
          <label className="auth-field">
            <span>College Name</span>
            <input
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, collegeName: event.target.value }))
              }
              placeholder="Exact approved college name"
              required
              type="text"
              value={profileForm.collegeName}
            />
          </label>
          <label className="auth-field">
            <span>Entrance Exams (comma separated)</span>
            <input
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, entranceExams: event.target.value }))
              }
              placeholder="JEE Main, GATE, CAT"
              type="text"
              value={profileForm.entranceExams}
            />
          </label>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>NIRF Ranking</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, nirf: event.target.value }))
                }
                type="text"
                value={profileForm.nirf}
              />
            </label>
            <label className="auth-field">
              <span>QS Ranking</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, qs: event.target.value }))
                }
                type="text"
                value={profileForm.qs}
              />
            </label>
            <label className="auth-field">
              <span>Other Ranking</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, otherRanking: event.target.value }))
                }
                type="text"
                value={profileForm.otherRanking}
              />
            </label>
          </div>
          <label className="auth-field">
            <span>Cut Off Summary</span>
            <textarea
              className="panel-textarea"
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, cutOffSummary: event.target.value }))
              }
              rows={3}
              value={profileForm.cutOffSummary}
            />
          </label>
          <label className="auth-field">
            <span>Placement Report Summary</span>
            <textarea
              className="panel-textarea"
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, placementReport: event.target.value }))
              }
              rows={3}
              value={profileForm.placementReport}
            />
          </label>
          <label className="auth-field">
            <span>Placement Report URL</span>
            <input
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, placementReportUrl: event.target.value }))
              }
              type="url"
              value={profileForm.placementReportUrl}
            />
          </label>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>Average Package (LPA)</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    averagePackageLpa: event.target.value
                  }))
                }
                type="text"
                value={profileForm.averagePackageLpa}
              />
            </label>
            <label className="auth-field">
              <span>Highest Package (LPA)</span>
              <input
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    highestPackageLpa: event.target.value
                  }))
                }
                type="text"
                value={profileForm.highestPackageLpa}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button className="auth-submit" disabled={profileSubmitting} type="submit">
              {profileSubmitting
                ? "Saving..."
                : editingProfileId
                  ? "Update College Details"
                  : "Save College Details"}
            </button>
            {editingProfileId ? (
              <button className="action-button neutral" onClick={resetProfileForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="College Notices"
        description="Create and manage published or draft notices only for colleges assigned to your account."
      >
        <form className="panel-form" onSubmit={handleNoticeSubmit}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>College Name</span>
              <select
                onChange={(event) =>
                  setNoticeForm((current) => ({ ...current, collegeName: event.target.value }))
                }
                required
                value={noticeForm.collegeName}
              >
                <option value="">Select college</option>
                {[...new Set(myColleges.map((item) => item.collegeName))].map((collegeName) => (
                  <option key={collegeName} value={collegeName}>
                    {collegeName}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-field">
              <span>Status</span>
              <select
                onChange={(event) =>
                  setNoticeForm((current) => ({
                    ...current,
                    isPublished: event.target.value === "published"
                  }))
                }
                value={noticeForm.isPublished ? "published" : "draft"}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>
          <label className="auth-field">
            <span>Notice Title</span>
            <input
              onChange={(event) => setNoticeForm((current) => ({ ...current, title: event.target.value }))}
              required
              type="text"
              value={noticeForm.title}
            />
          </label>
          <label className="auth-field">
            <span>Notice Content</span>
            <textarea
              className="panel-textarea"
              onChange={(event) => setNoticeForm((current) => ({ ...current, content: event.target.value }))}
              required
              rows={4}
              value={noticeForm.content}
            />
          </label>
          <div className="panel-actions">
            <button className="auth-submit" disabled={noticeSubmitting} type="submit">
              {noticeSubmitting
                ? "Saving..."
                : editingNoticeId
                  ? "Update Notice"
                  : "Create Notice"}
            </button>
            {editingNoticeId ? (
              <button className="action-button neutral" onClick={resetNoticeForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setNoticeSearch(event.target.value)}
            placeholder="Search notice title, content, or college..."
            type="text"
            value={noticeSearch}
          />
          <p className="muted">{filteredNotices.length} notices visible</p>
        </div>

        {!loading && filteredNotices.length === 0 ? (
          <p className="muted">No notices created for your colleges yet.</p>
        ) : null}

        <div className="panel-list">
          {filteredNotices.map((notice) => (
            <article className="panel-card" key={notice._id}>
              <h3>{notice.title}</h3>
              <p className="muted">
                {notice.collegeName || "Global"} | {notice.isPublished ? "Published" : "Draft"}
              </p>
              <p>{notice.content}</p>
              <div className="panel-actions">
                <button className="action-button approve" onClick={() => handleEditNotice(notice)} type="button">
                  Edit Notice
                </button>
                <button className="action-button reject" onClick={() => handleDeleteNotice(notice._id)} type="button">
                  Delete Notice
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Quiz Management"
        description="Create dynamic quiz arrangements for your assigned colleges from the representative panel."
      >
        <form className="panel-form" onSubmit={handleQuizSubmit}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>College Name</span>
              <select
                onChange={(event) =>
                  setQuizForm((current) => ({ ...current, collegeName: event.target.value }))
                }
                required
                value={quizForm.collegeName}
              >
                <option value="">Select college</option>
                {[...new Set(myColleges.map((item) => item.collegeName))].map((collegeName) => (
                  <option key={collegeName} value={collegeName}>
                    {collegeName}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-field">
              <span>Duration</span>
              <input
                onChange={(event) =>
                  setQuizForm((current) => ({ ...current, duration: event.target.value }))
                }
                placeholder="20 min"
                required
                type="text"
                value={quizForm.duration}
              />
            </label>
            <label className="auth-field">
              <span>Difficulty</span>
              <select
                onChange={(event) =>
                  setQuizForm((current) => ({ ...current, difficulty: event.target.value }))
                }
                value={quizForm.difficulty}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </label>
          </div>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>Quiz Title</span>
              <input
                onChange={(event) =>
                  setQuizForm((current) => ({ ...current, title: event.target.value }))
                }
                required
                type="text"
                value={quizForm.title}
              />
            </label>
            <label className="auth-field">
              <span>Quiz Mode</span>
              <input
                onChange={(event) =>
                  setQuizForm((current) => ({ ...current, mode: event.target.value }))
                }
                placeholder="PYQ sprint, notes recall, timed MCQ"
                required
                type="text"
                value={quizForm.mode}
              />
            </label>
            <label className="auth-field">
              <span>Status</span>
              <select
                onChange={(event) =>
                  setQuizForm((current) => ({
                    ...current,
                    isPublished: event.target.value === "published"
                  }))
                }
                value={quizForm.isPublished ? "published" : "draft"}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>
          <label className="auth-field">
            <span>Arrangement Note</span>
            <textarea
              className="panel-textarea"
              onChange={(event) =>
                setQuizForm((current) => ({ ...current, note: event.target.value }))
              }
              rows={2}
              value={quizForm.note}
            />
          </label>
          <label className="auth-field">
            <span>Resource Match</span>
            <input
              onChange={(event) =>
                setQuizForm((current) => ({ ...current, resourceMatch: event.target.value }))
              }
              placeholder="CN Topper Notes, DBMS PYQ"
              type="text"
              value={quizForm.resourceMatch}
            />
          </label>

          <div className="panel-list">
            {quizForm.questions.map((question, questionIndex) => (
              <article className="panel-card" key={`quiz-question-${questionIndex}`}>
                <h3>Question {questionIndex + 1}</h3>
                <label className="auth-field">
                  <span>Prompt</span>
                  <textarea
                    className="panel-textarea"
                    onChange={(event) =>
                      handleQuizQuestionChange(questionIndex, "prompt", event.target.value)
                    }
                    rows={2}
                    value={question.prompt}
                  />
                </label>
                <div className="panel-form-grid">
                  {question.options.map((option, optionIndex) => (
                    <label className="auth-field" key={`q${questionIndex}-opt${optionIndex}`}>
                      <span>Option {optionIndex + 1}</span>
                      <input
                        onChange={(event) =>
                          handleQuizOptionChange(questionIndex, optionIndex, event.target.value)
                        }
                        type="text"
                        value={option}
                      />
                    </label>
                  ))}
                </div>
                <label className="auth-field">
                  <span>Correct Answer</span>
                  <input
                    onChange={(event) =>
                      handleQuizQuestionChange(questionIndex, "answer", event.target.value)
                    }
                    placeholder="Must match one option exactly"
                    type="text"
                    value={question.answer}
                  />
                </label>
                <div className="panel-actions">
                  <button className="action-button neutral" onClick={addQuizQuestion} type="button">
                    Add Question
                  </button>
                  <button
                    className="action-button reject"
                    onClick={() => removeQuizQuestion(questionIndex)}
                    type="button"
                  >
                    Remove Question
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="panel-actions">
            <button className="auth-submit" disabled={quizSubmitting} type="submit">
              {quizSubmitting
                ? "Saving..."
                : editingQuizId
                  ? "Update Quiz Arrangement"
                  : "Create Quiz Arrangement"}
            </button>
            {editingQuizId ? (
              <button className="action-button neutral" onClick={resetQuizForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setQuizSearch(event.target.value)}
            placeholder="Search quiz title, mode, difficulty, or college..."
            type="text"
            value={quizSearch}
          />
          <p className="muted">{filteredQuizzes.length} quiz arrangements visible</p>
        </div>

        {!loading && filteredQuizzes.length === 0 ? (
          <p className="muted">No quiz arrangements created for your colleges yet.</p>
        ) : null}

        <div className="panel-list">
          {filteredQuizzes.map((quiz) => (
            <article className="panel-card" key={quiz._id}>
              <h3>{quiz.title}</h3>
              <p className="muted">
                {quiz.collegeName} | {quiz.difficulty} | {quiz.duration} | {quiz.isPublished ? "Published" : "Draft"}
              </p>
              <p className="muted">
                Mode: {quiz.mode} | Questions: {quiz.questions?.length || 0}
              </p>
              {quiz.note ? <p>{quiz.note}</p> : null}
              <div className="panel-actions">
                <button className="action-button approve" onClick={() => handleEditQuiz(quiz)} type="button">
                  Edit Quiz
                </button>
                <button className="action-button reject" onClick={() => handleDeleteQuiz(quiz._id)} type="button">
                  Delete Quiz
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="My Approved Colleges"
        description="Search, sort, and manage only the college records assigned to your account."
      >
        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setCollegeSearch(event.target.value)}
            placeholder="Search your college, course, or exam details..."
            type="text"
            value={collegeSearch}
          />
          <select
            className="college-search"
            onChange={(event) => setCollegeSort(event.target.value)}
            value={collegeSort}
          >
            <option value="college-asc">Sort by college</option>
            <option value="course-asc">Sort by course</option>
            <option value="semester-desc">Sort by semester count</option>
          </select>
        </div>
        {loading ? <p className="muted">Loading your approved colleges...</p> : null}
        {!loading && filteredColleges.length === 0 ? (
          <p className="muted">No approved colleges assigned to your account yet.</p>
        ) : null}
        <div className="panel-list">
          {filteredColleges.map((item) => (
            <article className="panel-card" key={item._id}>
              <h3>{item.collegeName}</h3>
              <p className="muted">
                Course: {item.courseName} | Semesters: {item.semesterCount}
              </p>
              <p className="muted">
                Approved by: {item.approvedByAdmin?.fullName || "Admin"}
              </p>
              <div className="panel-actions">
                <button className="action-button approve" onClick={() => handleEditCourse(item)} type="button">
                  Edit Course
                </button>
                <button className="action-button reject" onClick={() => handleDeleteCourse(item)} type="button">
                  Delete Course
                </button>
              </div>
              {item.profile ? (
                <div className="panel-subsection">
                  <p className="muted">
                    Exams: {item.profile.entranceExams?.length ? item.profile.entranceExams.join(", ") : "Not added"}
                  </p>
                  <p className="muted">
                    Rankings: NIRF {item.profile.rankings?.nirf || "-"} | QS {item.profile.rankings?.qs || "-"} | Other {item.profile.rankings?.other || "-"}
                  </p>
                  <div className="panel-actions">
                    <button
                      className="action-button approve"
                      onClick={() => handleEditProfile(item.profile)}
                      type="button"
                    >
                      Edit Profile
                    </button>
                    <button
                      className="action-button reject"
                      onClick={() => handleDeleteProfile(item.profile)}
                      type="button"
                    >
                      Delete Profile
                    </button>
                  </div>
                </div>
              ) : (
                <div className="panel-subsection">
                  <p className="muted">No profile details added yet for this college.</p>
                  <button
                    className="action-button approve"
                    onClick={() =>
                      setProfileForm((current) => ({ ...current, collegeName: item.collegeName }))
                    }
                    type="button"
                  >
                    Add Profile Details
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="My Requests" description="Track approval status with search and status filters.">
        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setRequestSearch(event.target.value)}
            placeholder="Search request by college or course..."
            type="text"
            value={requestSearch}
          />
          <select
            className="college-search"
            onChange={(event) => setRequestFilter(event.target.value)}
            value={requestFilter}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        {loading ? <p className="muted">Loading requests...</p> : null}
        {!loading && filteredRequests.length === 0 ? (
          <p className="muted">You have not submitted any matching requests yet.</p>
        ) : null}
        <div className="panel-list">
          {filteredRequests.map((request) => (
            <article className="panel-card" key={request._id}>
              <h3>{request.collegeName}</h3>
              <p className="muted">
                Course: {request.courseName} | Semesters: {request.semesterCount}
              </p>
              <p className={`status-chip ${request.status}`}>Status: {request.status}</p>
              {request.decisionNote ? <p className="muted">Note: {request.decisionNote}</p> : null}
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
