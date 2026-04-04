import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { apiClient } from "../lib/apiClient";
import { useToast } from "../ui/ToastContext";

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

const initialStructureForm = {
  collegeName: "",
  programId: "btech",
  programName: "BTech",
  branchId: "",
  branchName: "",
  branchDescription: "",
  semesterId: "",
  semesterName: "",
  semesterOrder: 1
};

const initialSubjectForm = {
  collegeName: "",
  programId: "btech",
  branchId: "",
  semesterId: "",
  subjectId: "",
  name: ""
};

function normalizeSearchValue(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

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

function mapStructureToForm(structure) {
  if (!structure) {
    return initialStructureForm;
  }

  return {
    collegeName: structure.collegeName || "",
    programId: structure.programId || "btech",
    programName: structure.programName || "",
    branchId: structure.branchId || "",
    branchName: structure.branchName || "",
    branchDescription: structure.branchDescription || "",
    semesterId: structure.semesterId || "",
    semesterName: structure.semesterName || "",
    semesterOrder: Number(structure.semesterOrder) || 1
  };
}

function mapSubjectToForm(subject) {
  if (!subject) {
    return initialSubjectForm;
  }

  return {
    collegeName: subject.collegeName || "",
    programId: subject.programId || "btech",
    branchId: subject.branchId || "",
    semesterId: subject.semesterId || "",
    subjectId: subject.subjectId || "",
    name: subject.name || ""
  };
}

export function RepresentativePanelPage() {
  const { colleges: platformColleges } = useCollege();
  const { showError, showSuccess } = useToast();
  const [form, setForm] = useState(initialForm);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [requests, setRequests] = useState([]);
  const [myColleges, setMyColleges] = useState([]);
  const [notices, setNotices] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [structures, setStructures] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [requestableColleges, setRequestableColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [noticeSubmitting, setNoticeSubmitting] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState("");
  const [editingProfileId, setEditingProfileId] = useState("");
  const [editingNoticeId, setEditingNoticeId] = useState("");
  const [editingQuizId, setEditingQuizId] = useState("");
  const [editingStructureId, setEditingStructureId] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState("");
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
  const [structureForm, setStructureForm] = useState(initialStructureForm);
  const [structureSubmitting, setStructureSubmitting] = useState(false);
  const [structureSearch, setStructureSearch] = useState("");
  const [subjectForm, setSubjectForm] = useState(initialSubjectForm);
  const [subjectSubmitting, setSubjectSubmitting] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [openSelector, setOpenSelector] = useState("");

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

      try {
        const requestableResponse = await apiClient.get("/governance/requestable-colleges");
        setRequestableColleges(requestableResponse.data.data || []);
      } catch {
        setRequestableColleges([]);
      }

      const collegeNames = [...new Set(collegeItems.map((item) => item.collegeName).filter(Boolean))];
      if (collegeNames.length) {
        const [noticeResponses, quizResponses, structureResponses, subjectResponses] = await Promise.all([
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
          ),
          Promise.all(
            collegeNames.map((collegeName) =>
              apiClient.get("/academic/structures", {
                params: { collegeName }
              })
            )
          ),
          Promise.all(
            collegeNames.map((collegeName) =>
              apiClient.get("/academic/subjects", {
                params: { collegeName }
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
        const allStructures = structureResponses.flatMap((response) => response.data.data || []);
        const uniqueStructures = Array.from(new Map(allStructures.map((item) => [item._id, item])).values());
        setStructures(uniqueStructures);
        const allSubjects = subjectResponses.flatMap((response) => response.data.data || []);
        const uniqueSubjects = Array.from(new Map(allSubjects.map((item) => [item._id, item])).values());
        setSubjects(uniqueSubjects);
      } else {
        setNotices([]);
        setQuizzes([]);
        setStructures([]);
        setSubjects([]);
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

  function resetStructureForm() {
    setStructureForm(initialStructureForm);
    setEditingStructureId("");
  }

  function resetSubjectForm() {
    setSubjectForm(initialSubjectForm);
    setEditingSubjectId("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (selectedCourseCatalogEntry?.hasActiveRepresentative) {
        const representativeLabel = selectedCourseCatalogEntry.representativeName
          ? `${selectedCourseCatalogEntry.representativeName} (${selectedCourseCatalogEntry.representativeEmail})`
          : "an active representative";
        const message = `This course already has ${representativeLabel}. Request cannot be submitted.`;
        setError(message);
        showError(message);
        setSubmitting(false);
        return;
      }

      const payload = {
        ...form,
        semesterCount: Number(form.semesterCount)
      };

      if (editingCourseId) {
        await apiClient.patch(`/governance/approved-courses/${editingCourseId}`, payload);
        setSuccess("College course details updated successfully.");
        showSuccess("College course details updated successfully.");
      } else {
        await apiClient.post("/governance/requests", payload);
        setSuccess("Request submitted for admin verification.");
        showSuccess("Request submitted for admin verification.");
      }

      resetCourseForm();
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to save college course details.";
      setError(message);
      showError(message);
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
      showSuccess(editingProfileId ? "College profile updated successfully." : "College profile saved successfully.");
      resetProfileForm();
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to save college profile.";
      setError(message);
      showError(message);
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
      showSuccess(response.data.message || "College course deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete college course.";
      setError(message);
      showError(message);
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
      showSuccess(response.data.message || "College profile deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete college profile.";
      setError(message);
      showError(message);
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
        showSuccess("Notice updated successfully.");
      } else {
        await apiClient.post("/notices", noticeForm);
        setSuccess("Notice created successfully.");
        showSuccess("Notice created successfully.");
      }

      resetNoticeForm();
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to save notice.";
      setError(message);
      showError(message);
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
      showSuccess("Notice deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete notice.";
      setError(message);
      showError(message);
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
        showSuccess("Quiz arrangement updated successfully.");
      } else {
        await apiClient.post("/quizzes", payload);
        setSuccess("Quiz arrangement created successfully.");
        showSuccess("Quiz arrangement created successfully.");
      }

      resetQuizForm();
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to save quiz arrangement.";
      setError(message);
      showError(message);
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
      showSuccess("Quiz arrangement deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete quiz arrangement.";
      setError(message);
      showError(message);
    }
  }

  async function handleStructureSubmit(event) {
    event.preventDefault();
    setStructureSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...structureForm,
        semesterOrder: Number(structureForm.semesterOrder)
      };

      if (editingStructureId) {
        await apiClient.patch(`/academic/structures/${editingStructureId}`, payload);
        setSuccess("Academic structure updated successfully.");
        showSuccess("Academic structure updated successfully.");
      } else {
        await apiClient.post("/academic/structures", payload);
        setSuccess("Academic structure created successfully.");
        showSuccess("Academic structure created successfully.");
      }

      resetStructureForm();
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to save academic structure.";
      setError(message);
      showError(message);
    } finally {
      setStructureSubmitting(false);
    }
  }

  function handleEditStructure(structure) {
    setEditingStructureId(structure._id);
    setStructureForm(mapStructureToForm(structure));
    setError("");
    setSuccess("");
  }

  async function handleDeleteStructure(structureId) {
    setError("");
    setSuccess("");

    try {
      await apiClient.delete(`/academic/structures/${structureId}`);
      if (editingStructureId === structureId) {
        resetStructureForm();
      }
      setSuccess("Academic structure deleted successfully.");
      showSuccess("Academic structure deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete academic structure.";
      setError(message);
      showError(message);
    }
  }

  async function handleSubjectSubmit(event) {
    event.preventDefault();
    setSubjectSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = { ...subjectForm };

      if (editingSubjectId) {
        await apiClient.patch(`/academic/subjects/${editingSubjectId}`, payload);
        setSuccess("Subject updated successfully.");
        showSuccess("Subject updated successfully.");
      } else {
        await apiClient.post("/academic/subjects", payload);
        setSuccess("Subject created successfully.");
        showSuccess("Subject created successfully.");
      }

      resetSubjectForm();
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to save subject.";
      setError(message);
      showError(message);
    } finally {
      setSubjectSubmitting(false);
    }
  }

  function handleEditSubject(subject) {
    setEditingSubjectId(subject._id);
    setSubjectForm(mapSubjectToForm(subject));
    setError("");
    setSuccess("");
  }

  async function handleDeleteSubject(subjectId) {
    setError("");
    setSuccess("");

    try {
      await apiClient.delete(`/academic/subjects/${subjectId}`);
      if (editingSubjectId === subjectId) {
        resetSubjectForm();
      }
      setSuccess("Subject deleted successfully.");
      showSuccess("Subject deleted successfully.");
      await loadRepresentativeData();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete subject.";
      setError(message);
      showError(message);
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

  const filteredStructures = useMemo(() => {
    const term = structureSearch.trim().toLowerCase();

    return structures.filter((structure) => {
      if (!term) {
        return true;
      }

      return (
        structure.collegeName?.toLowerCase().includes(term) ||
        structure.programName?.toLowerCase().includes(term) ||
        structure.branchName?.toLowerCase().includes(term) ||
        structure.semesterName?.toLowerCase().includes(term)
      );
    });
  }, [structureSearch, structures]);

  const filteredSubjects = useMemo(() => {
    const term = subjectSearch.trim().toLowerCase();

    return subjects.filter((subject) => {
      if (!term) {
        return true;
      }

      return (
        subject.collegeName?.toLowerCase().includes(term) ||
        subject.name?.toLowerCase().includes(term) ||
        subject.branchId?.toLowerCase().includes(term) ||
        subject.semesterId?.toLowerCase().includes(term) ||
        subject.subjectId?.toLowerCase().includes(term)
      );
    });
  }, [subjectSearch, subjects]);

  const collegeCatalogOptions = useMemo(() => {
    const merged = new Map();

    requestableColleges.forEach((item) => {
      merged.set(item.collegeNameNormalized, item);
    });

    platformColleges.forEach((college) => {
      const normalizedName = normalizeSearchValue(college.name);

      if (!merged.has(normalizedName)) {
        merged.set(normalizedName, {
          collegeName: college.name,
          collegeNameNormalized: normalizedName,
          courses: []
        });
      }
    });

    return Array.from(merged.values()).sort((left, right) =>
      left.collegeName.localeCompare(right.collegeName)
    );
  }, [platformColleges, requestableColleges]);

  const matchingCollegeOption = useMemo(
    () =>
      collegeCatalogOptions.find(
        (item) =>
          normalizeSearchValue(item.collegeName) === normalizeSearchValue(form.collegeName.trim())
      ) || null,
    [collegeCatalogOptions, form.collegeName]
  );

  const filteredRequestableColleges = useMemo(() => {
    const term = normalizeSearchValue(form.collegeName);

    if (!term) {
      return collegeCatalogOptions.slice(0, 8);
    }

    return collegeCatalogOptions
      .filter(
        (item) => normalizeSearchValue(item.collegeName).includes(term)
      )
      .slice(0, 8);
  }, [collegeCatalogOptions, form.collegeName]);

  const suggestedCourses = useMemo(() => {
    if (!matchingCollegeOption) {
      return [];
    }

    const term = form.courseName.trim().toLowerCase();
    if (!term) {
      return matchingCollegeOption.courses.slice(0, 8);
    }

    return matchingCollegeOption.courses
      .filter(
        (course) =>
          course.courseName.toLowerCase().startsWith(term) ||
          course.courseName.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [form.courseName, matchingCollegeOption]);

  const selectedCourseCatalogEntry = useMemo(() => {
    if (!matchingCollegeOption) {
      return null;
    }

    return (
      matchingCollegeOption.courses.find(
        (course) => course.courseName.toLowerCase() === form.courseName.trim().toLowerCase()
      ) || null
    );
  }, [form.courseName, matchingCollegeOption]);

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
        label: "Dynamic Subjects",
        value: subjects.length,
        note: "Database-driven college subject list"
      },
      {
        label: "Visible Search Results",
        value: filteredColleges.length,
        note: "Based on your current filter"
      }
    ],
    [filteredColleges.length, myColleges, requests, subjects.length]
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
              <div className="selector-field">
                <input
                  onChange={(event) => {
                    setForm((current) => ({ ...current, collegeName: event.target.value }));
                    setOpenSelector("college");
                  }}
                  onFocus={() => setOpenSelector("college")}
                  placeholder="Type college name"
                  required
                  type="text"
                  value={form.collegeName}
                />
                <button
                  aria-label="Open college list"
                  className="selector-trigger-button"
                  onClick={() =>
                    setOpenSelector((current) => (current === "college" ? "" : "college"))
                  }
                  type="button"
                >
                  ˅
                </button>
                {openSelector === "college" ? (
                  <div className="selector-dropdown-panel">
                    {filteredRequestableColleges.length ? (
                      filteredRequestableColleges.map((item) => (
                        <button
                          className="selector-dropdown-option"
                          key={item.collegeNameNormalized}
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              collegeName: item.collegeName,
                              courseName:
                                item.courses.some(
                                  (course) =>
                                    course.courseName.toLowerCase() ===
                                    current.courseName.trim().toLowerCase()
                                )
                                  ? current.courseName
                                  : ""
                            }));
                            setOpenSelector("");
                          }}
                          type="button"
                        >
                          {item.collegeName}
                        </button>
                      ))
                    ) : (
                      <p className="selector-dropdown-empty">
                        No matching college found. You can type full name manually.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </label>
            <label className="auth-field">
              <span>Course Name</span>
              <div className="selector-field">
                <input
                  onChange={(event) => {
                    setForm((current) => ({ ...current, courseName: event.target.value }));
                    if (matchingCollegeOption?.courses?.length) {
                      setOpenSelector("course");
                    }
                  }}
                  onFocus={() => {
                    if (matchingCollegeOption?.courses?.length) {
                      setOpenSelector("course");
                    }
                  }}
                  placeholder={
                    matchingCollegeOption
                      ? "Choose suggested course or type manually"
                      : "Type course name"
                  }
                  required
                  type="text"
                  value={form.courseName}
                />
                <button
                  aria-label="Open course list"
                  className="selector-trigger-button"
                  onClick={() =>
                    setOpenSelector((current) =>
                      current === "course" ? "" : matchingCollegeOption?.courses?.length ? "course" : ""
                    )
                  }
                  type="button"
                >
                  ˅
                </button>
                {openSelector === "course" && matchingCollegeOption?.courses?.length ? (
                  <div className="selector-dropdown-panel">
                    {suggestedCourses.length ? (
                      suggestedCourses.map((course) => (
                        <button
                          className="selector-dropdown-option"
                          key={`${course.courseName}-${course.semesterCount}`}
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              courseName: course.courseName,
                              semesterCount: course.semesterCount
                            }));
                            setOpenSelector("");
                          }}
                          type="button"
                        >
                          {course.courseName}
                        </button>
                      ))
                    ) : (
                      <p className="selector-dropdown-empty">No matching course found.</p>
                    )}
                  </div>
                ) : null}
              </div>
              {selectedCourseCatalogEntry ? (
                <p className="muted">
                  {selectedCourseCatalogEntry.hasActiveRepresentative
                    ? `Already managed by ${selectedCourseCatalogEntry.representativeName || "an active representative"}.`
                    : "No active representative found for this course. You can send request."}
                </p>
              ) : null}
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
          <p className="muted">
            Type a starting letter like m to see matching colleges alphabetically, then choose the course to verify representative availability.
          </p>
          <p className="muted">
            If your college is not listed, you can still type the full college name manually and submit a new request.
          </p>
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
        title="Academic Structure Management"
        description="Create branch and semester structure dynamically for your approved colleges so each college can maintain its own academic map."
      >
        <form className="panel-form" onSubmit={handleStructureSubmit}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>College Name</span>
              <select
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, collegeName: event.target.value }))
                }
                required
                value={structureForm.collegeName}
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
              <span>Program ID</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, programId: event.target.value }))
                }
                placeholder="btech, mca, mtech"
                required
                type="text"
                value={structureForm.programId}
              />
            </label>
            <label className="auth-field">
              <span>Program Name</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, programName: event.target.value }))
                }
                placeholder="BTech"
                required
                type="text"
                value={structureForm.programName}
              />
            </label>
          </div>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>Branch ID</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, branchId: event.target.value }))
                }
                placeholder="computer-science-engineering"
                required
                type="text"
                value={structureForm.branchId}
              />
            </label>
            <label className="auth-field">
              <span>Branch Name</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, branchName: event.target.value }))
                }
                placeholder="Computer Science & Engineering"
                required
                type="text"
                value={structureForm.branchName}
              />
            </label>
            <label className="auth-field">
              <span>Semester ID</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, semesterId: event.target.value }))
                }
                placeholder="semester-1"
                required
                type="text"
                value={structureForm.semesterId}
              />
            </label>
          </div>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>Semester Name</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, semesterName: event.target.value }))
                }
                placeholder="Semester I"
                required
                type="text"
                value={structureForm.semesterName}
              />
            </label>
            <label className="auth-field">
              <span>Semester Order</span>
              <input
                min="1"
                onChange={(event) =>
                  setStructureForm((current) => ({ ...current, semesterOrder: event.target.value }))
                }
                required
                type="number"
                value={structureForm.semesterOrder}
              />
            </label>
            <label className="auth-field">
              <span>Branch Description</span>
              <input
                onChange={(event) =>
                  setStructureForm((current) => ({
                    ...current,
                    branchDescription: event.target.value
                  }))
                }
                placeholder="Multiple engineering branches"
                type="text"
                value={structureForm.branchDescription}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button className="auth-submit" disabled={structureSubmitting} type="submit">
              {structureSubmitting
                ? "Saving..."
                : editingStructureId
                  ? "Update Academic Structure"
                  : "Create Academic Structure"}
            </button>
            {editingStructureId ? (
              <button className="action-button neutral" onClick={resetStructureForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setStructureSearch(event.target.value)}
            placeholder="Search college, branch, program, or semester..."
            type="text"
            value={structureSearch}
          />
          <p className="muted">{filteredStructures.length} structures visible</p>
        </div>

        {!loading && filteredStructures.length === 0 ? (
          <p className="muted">No academic structure records created for your colleges yet.</p>
        ) : null}

        <div className="panel-list">
          {filteredStructures.map((structure) => (
            <article className="panel-card" key={structure._id}>
              <h3>{structure.branchName}</h3>
              <p className="muted">
                {structure.collegeName} | {structure.programName} | {structure.semesterName}
              </p>
              <p className="muted">
                Branch ID: {structure.branchId} | Semester ID: {structure.semesterId} | Order: {structure.semesterOrder}
              </p>
              {structure.branchDescription ? <p>{structure.branchDescription}</p> : null}
              <div className="panel-actions">
                <button className="action-button approve" onClick={() => handleEditStructure(structure)} type="button">
                  Edit Structure
                </button>
                <button className="action-button reject" onClick={() => handleDeleteStructure(structure._id)} type="button">
                  Delete Structure
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Subject Management"
        description="Create semester-wise subjects for your own colleges. These subjects drive the branch and subject pages dynamically."
      >
        <form className="panel-form" onSubmit={handleSubjectSubmit}>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>College Name</span>
              <select
                onChange={(event) =>
                  setSubjectForm((current) => ({ ...current, collegeName: event.target.value }))
                }
                required
                value={subjectForm.collegeName}
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
              <span>Program ID</span>
              <input
                onChange={(event) =>
                  setSubjectForm((current) => ({ ...current, programId: event.target.value }))
                }
                placeholder="btech"
                required
                type="text"
                value={subjectForm.programId}
              />
            </label>
            <label className="auth-field">
              <span>Branch ID</span>
              <input
                onChange={(event) =>
                  setSubjectForm((current) => ({ ...current, branchId: event.target.value }))
                }
                placeholder="computer-science-engineering"
                required
                type="text"
                value={subjectForm.branchId}
              />
            </label>
          </div>
          <div className="panel-form-grid">
            <label className="auth-field">
              <span>Semester ID</span>
              <input
                onChange={(event) =>
                  setSubjectForm((current) => ({ ...current, semesterId: event.target.value }))
                }
                placeholder="semester-1"
                required
                type="text"
                value={subjectForm.semesterId}
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
            <label className="auth-field">
              <span>Subject Name</span>
              <input
                onChange={(event) =>
                  setSubjectForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Mathematics-I"
                required
                type="text"
                value={subjectForm.name}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button className="auth-submit" disabled={subjectSubmitting} type="submit">
              {subjectSubmitting
                ? "Saving..."
                : editingSubjectId
                  ? "Update Subject"
                  : "Create Subject"}
            </button>
            {editingSubjectId ? (
              <button className="action-button neutral" onClick={resetSubjectForm} type="button">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="toolbar-grid">
          <input
            className="college-search"
            onChange={(event) => setSubjectSearch(event.target.value)}
            placeholder="Search subject, branch id, semester id, or college..."
            type="text"
            value={subjectSearch}
          />
          <p className="muted">{filteredSubjects.length} subjects visible</p>
        </div>

        {!loading && filteredSubjects.length === 0 ? (
          <p className="muted">No dynamic subjects created for your colleges yet.</p>
        ) : null}

        <div className="panel-list">
          {filteredSubjects.map((subject) => (
            <article className="panel-card" key={subject._id}>
              <h3>{subject.name}</h3>
              <p className="muted">
                {subject.collegeName} | {subject.programId} | {subject.branchId} | {subject.semesterId}
              </p>
              <p className="muted">Subject ID: {subject.subjectId}</p>
              <div className="panel-actions">
                <button className="action-button approve" onClick={() => handleEditSubject(subject)} type="button">
                  Edit Subject
                </button>
                <button className="action-button reject" onClick={() => handleDeleteSubject(subject._id)} type="button">
                  Delete Subject
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
