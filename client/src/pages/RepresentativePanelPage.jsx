import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { SectionCard } from "../components/SectionCard";
import { useCollege } from "../college/CollegeContext";
import { apiClient } from "../lib/apiClient";
import { requestDeletePassword } from "../lib/deleteWithPassword";
import { useToast } from "../ui/ToastContext";
import { CourseForm } from "../components/forms/CourseForm";
import { StructureForm } from "../components/forms/StructureForm";
import { SubjectForm } from "../components/forms/SubjectForm";
import { NoticeForm } from "../components/forms/NoticeForm";
import { normalizeSearchValue, normalizeRouteId } from "../lib/stringUtils";

const initialForm = {
  collegeName: "",
  courseName: ""
};

const initialProfileForm = {
  collegeName: "",
  courseId: "overall",
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
  programId: "",
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

function mapProfileToForm(profile) {
  if (!profile) {
    return initialProfileForm;
  }

  return {
    collegeName: profile.collegeName || "",
    courseId: profile.courseId || "overall",
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
    programId: quiz.programId || "",
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
  const { user, refreshCurrentUser } = useAuth();
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
  const representativeCollegeNames = useMemo(
    () => [...new Set(myColleges.map((item) => item.collegeName).filter(Boolean))],
    [myColleges]
  );
  const profileCollegeCourses = useMemo(() => {
    if (!profileForm.collegeName) return [];
    const matched = myColleges.filter(
      (item) => item.collegeName.toLowerCase() === profileForm.collegeName.toLowerCase()
    );
    return matched.map((item) => ({
      id: normalizeRouteId(item.courseName),
      name: item.courseName
    }));
  }, [myColleges, profileForm.collegeName]);
  const availableQuizPrograms = useMemo(
    () =>
      myColleges
        .filter((item) => item.collegeName === quizForm.collegeName)
        .map((item) => item.courseName)
        .filter(Boolean),
    [myColleges, quizForm.collegeName]
  );

  async function loadRepresentativeData() {
    setLoading(true);
    setError("");

    try {
      const collegesResponse = await apiClient.get("/governance/approved-courses/my");

      setRequests([]);
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
            collegeItems.map((item) =>
              apiClient.get("/quizzes", {
                params: {
                  collegeName: item.collegeName,
                  programId: item.courseName,
                  includeUnpublished: true
                }
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

  useEffect(() => {
    if (user?.collegeName) {
      setForm((current) => ({
        ...current,
        collegeName: current.collegeName || user.collegeName
      }));
      setProfileForm((current) => ({
        ...current,
        collegeName: current.collegeName || user.collegeName
      }));
    }
  }, [user]);

  function resetCourseForm() {
    setForm({
      collegeName: user?.collegeName || "",
      courseName: ""
    });
    setEditingCourseId("");
  }

  function resetProfileForm() {
    setProfileForm({
      ...initialProfileForm,
      collegeName: user?.collegeName || ""
    });
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
        const message =
          "This course already has an approved representative. Request cannot be submitted.";
        setError(message);
        showError(message);
        setSubmitting(false);
        return;
      }

      const payload = {
        ...form
      };

      if (editingCourseId) {
        await apiClient.patch(`/governance/approved-courses/${editingCourseId}`, payload);
        setSuccess("College course details updated successfully.");
        showSuccess("College course details updated successfully.");
      } else {
        await apiClient.post("/governance/requests", payload);
        setSuccess("College course request submitted to admin for approval.");
        showSuccess("College course request submitted to admin for approval.");
      }

      resetCourseForm();
      await Promise.all([loadRepresentativeData(), refreshCurrentUser()]);
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
        courseId: profileForm.courseId,
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
      courseName: course.courseName
    });
  }

  function handleEditProfile(profile) {
    setError("");
    setSuccess("");
    setEditingProfileId(profile._id);
    setProfileForm(mapProfileToForm(profile));
  }

  async function handleDeleteCourse(course) {
    const currentPassword = requestDeletePassword(
      `${course.courseName} from ${course.collegeName}`
    );
    if (!currentPassword) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiClient.delete(`/governance/approved-courses/${course._id}`, {
        data: { currentPassword }
      });
      if (editingCourseId === course._id) {
        resetCourseForm();
      }
      if (editingProfileId && course.profile?._id === editingProfileId) {
        resetProfileForm();
      }
      setSuccess(response.data.message || "College course deleted successfully.");
      showSuccess(response.data.message || "College course deleted successfully.");
      await Promise.all([loadRepresentativeData(), refreshCurrentUser()]);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete college course.";
      setError(message);
      showError(message);
    }
  }

  async function handleDeleteCollege(course) {
    const currentPassword = requestDeletePassword(
      `${course.collegeName} and all college records created under your account`
    );
    if (!currentPassword) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiClient.delete(
        `/governance/approved-courses/${course._id}/college`,
        {
          data: { currentPassword }
        }
      );
      if (editingCourseId === course._id) {
        resetCourseForm();
      }
      if (editingProfileId && course.profile?._id === editingProfileId) {
        resetProfileForm();
      }
      setSuccess(response.data.message || "College deleted successfully.");
      showSuccess(response.data.message || "College deleted successfully.");
      await Promise.all([loadRepresentativeData(), refreshCurrentUser()]);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to delete college.";
      setError(message);
      showError(message);
    }
  }

  async function handleDeleteProfile(profile) {
    const currentPassword = requestDeletePassword(
      `the profile details for ${profile.collegeName}`
    );
    if (!currentPassword) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiClient.delete(`/governance/college-profile/${profile._id}`, {
        data: { currentPassword }
      });
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
    const currentPassword = requestDeletePassword("this notice");
    if (!currentPassword) {
      return;
    }
    setError("");
    setSuccess("");

    try {
      await apiClient.delete(`/notices/${noticeId}`, { data: { currentPassword } });
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
    const currentPassword = requestDeletePassword("this quiz");
    if (!currentPassword) {
      return;
    }
    setError("");
    setSuccess("");

    try {
      await apiClient.delete(`/quizzes/${quizId}`, { data: { currentPassword } });
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
    const currentPassword = requestDeletePassword("this academic structure");
    if (!currentPassword) {
      return;
    }
    setError("");
    setSuccess("");

    try {
      await apiClient.delete(`/academic/structures/${structureId}`, {
        data: { currentPassword }
      });
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
    const currentPassword = requestDeletePassword("this subject");
    if (!currentPassword) {
      return;
    }
    setError("");
    setSuccess("");

    try {
      await apiClient.delete(`/academic/subjects/${subjectId}`, {
        data: { currentPassword }
      });
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

    if (user?.collegeName) {
      const normalizedName = normalizeSearchValue(user.collegeName);
      if (!merged.has(normalizedName)) {
        merged.set(normalizedName, {
          collegeName: user.collegeName,
          collegeNameNormalized: normalizedName,
          courses: []
        });
      }
    }

    return Array.from(merged.values()).sort((left, right) =>
      left.collegeName.localeCompare(right.collegeName)
    );
  }, [platformColleges, requestableColleges, user?.collegeName]);

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

  const noticeCollegesList = useMemo(() => {
    const list = [];
    if (user?.collegeName) {
      list.push(user.collegeName);
    }
    myColleges.forEach((item) => {
      if (item.collegeName && !list.includes(item.collegeName)) {
        list.push(item.collegeName);
      }
    });
    return list;
  }, [user?.collegeName, myColleges]);

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
        label: "Managed Courses",
        value: myColleges.length,
        note: "Directly editable after representative approval"
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
    <div className="dense-admin">
      <div className="page-stack">
      <SectionCard
        title={user?.collegeName ? `Representative Panel — ${user.collegeName}` : "Representative Panel"}
        description="Manage only the colleges and courses assigned under your approved representative account."
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
        description="Add a college and course directly under your approved representative account, or update one of your assigned course entries."
      >
        <CourseForm
          formValue={form}
          onChange={(key, val) => setForm((current) => ({ ...current, [key]: val }))}
          onSubmit={handleSubmit}
          onCancel={resetCourseForm}
          isEditing={Boolean(editingCourseId)}
          isDropdown={true}
          collegesList={collegeCatalogOptions}
          selectedCourseCatalogEntry={selectedCourseCatalogEntry}
          submitting={submitting}
        />
      </SectionCard>

      <SectionCard
        title="College Detail Entry"
        description="Add exam, ranking, cut-off, and placement details for your own approved colleges."
      >
        <form className="panel-form" onSubmit={handleProfileSubmit}>
          <div className="panel-form-grid">
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
              <span>Program / Course Scope</span>
              <select
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, courseId: event.target.value }))
                }
                value={profileForm.courseId}
              >
                <option value="overall">Overall Profile</option>
                {profileCollegeCourses.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
              placeholder="Summarize cutoff criteria. Markdown tables are supported. Example:&#10;| Branch | Cut-off |&#10;| --- | --- |&#10;| CSE | 5000 |"
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
              placeholder="Summarize placement records. Markdown tables are supported. Example:&#10;| Branch | Avg Package |&#10;| --- | --- |&#10;| CSE | 24 LPA |"
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
        <NoticeForm
          formValue={noticeForm}
          onChange={(key, val) => setNoticeForm((current) => ({ ...current, [key]: val }))}
          onSubmit={handleNoticeSubmit}
          onCancel={resetNoticeForm}
          isEditing={Boolean(editingNoticeId)}
          isDropdown={true}
          collegesList={noticeCollegesList}
          submitting={noticeSubmitting}
        />

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
        description="Track branch and semester records here. Use the college overview and course pages as the main place to add branches and semesters."
      >
        <div className="panel-subsection">
          <p className="muted">
            Simpler workflow:
            choose college from Overview, add course, open the course page, add branch with semester count,
            then open the branch page to add subjects.
          </p>
          <div className="panel-actions">
            <Link className="open-college-button" to="/dashboard">
              Open Overview Workflow
            </Link>
          </div>
        </div>

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
        description="Track created subjects here. The easier way to add new subjects is now from the branch page inside the overview workflow."
      >
        <div className="panel-subsection">
          <p className="muted">
            After a branch is created, open that branch page and add subjects there. Every subject automatically
            gets Notice, Syllabus, Books, Class Notes, PDF/PPT, Lecture, Lab, PYQ, and Suggestion sections.
          </p>
          <div className="panel-actions">
            <Link className="open-college-button" to="/dashboard">
              Go To Overview
            </Link>
          </div>
        </div>

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
                  setQuizForm((current) => ({
                    ...current,
                    collegeName: event.target.value,
                    programId: ""
                  }))
                }
                required
                value={quizForm.collegeName}
              >
                <option value="">Select college</option>
                {representativeCollegeNames.map((collegeName) => (
                  <option key={collegeName} value={collegeName}>
                    {collegeName}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-field">
              <span>Course / Program</span>
              <select
                onChange={(event) =>
                  setQuizForm((current) => ({ ...current, programId: event.target.value }))
                }
                required
                value={quizForm.programId}
              >
                <option value="">Select course</option>
                {availableQuizPrograms.map((courseName) => (
                  <option key={courseName} value={courseName}>
                    {courseName}
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
                {quiz.collegeName} | {quiz.programId} | {quiz.difficulty} | {quiz.duration} |{" "}
                {quiz.isPublished ? "Published" : "Draft"}
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
          {filteredColleges.map((item, index) => {
            const isFirstCollegeCard =
              filteredColleges.findIndex(
                (entry) =>
                  String(entry.collegeName || "").trim().toLowerCase() ===
                  String(item.collegeName || "").trim().toLowerCase()
              ) === index;

            return (
            <article className="panel-card" key={item._id}>
              <h3>{item.collegeName}</h3>
              <p className="muted">
                Course: {item.courseName} | Semester count is branch-defined
              </p>
              <p className="muted">
                Approved by: {item.approvedByAdmin?.fullName || "Admin"}
              </p>
              <div className="panel-actions">
                <Link
                  className="action-button neutral"
                  to={`/dashboard/${normalizeRouteId(item.courseName)}`}
                >
                  Open Course Page
                </Link>
                <button className="action-button approve" onClick={() => handleEditCourse(item)} type="button">
                  Edit Course
                </button>
                <button className="action-button reject" onClick={() => handleDeleteCourse(item)} type="button">
                  Delete Course
                </button>
                {isFirstCollegeCard ? (
                  <button
                    className="action-button reject"
                    onClick={() => handleDeleteCollege(item)}
                    type="button"
                  >
                    Delete College
                  </button>
                ) : null}
              </div>
              {item.profile ? (
                <div className="panel-subsection">
                  <p className="muted">
                    Exams: {item.profile.entranceExams?.length ? item.profile.entranceExams.join(", ") : "Not added"}
                  </p>
                  <p className="muted">
                    Rankings: NIRF {item.profile.rankings?.nirf || "-"} | QS {item.profile.rankings?.qs || "-"} | Other {item.profile.rankings?.other || "-"}
                  </p>
                  <p className="muted" style={{ marginTop: "0.25rem" }}>
                    Profile Scope: <strong style={{ color: "#ffcf7c", textTransform: "uppercase" }}>{item.profile.courseId || "overall"}</strong>
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
                      setProfileForm((current) => ({
                        ...current,
                        collegeName: item.collegeName,
                        courseId: normalizeRouteId(item.courseName)
                      }))
                    }
                    type="button"
                  >
                    Add Profile Details
                  </button>
                </div>
              )}
            </article>
            );
          })}
        </div>
      </SectionCard>
    </div>
  </div>
  );
}
