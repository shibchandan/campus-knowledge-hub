export const academicPrograms = [
  {
    id: "btech",
    name: "BTech",
    branch: "Multiple Engineering Branches",
    description: "Choose a branch, then open its semester-wise subjects."
  },
  {
    id: "mca",
    name: "MCA",
    branch: "Application Domains",
    description: "Choose an MCA domain and view its 4-semester structure."
  },
  {
    id: "mtech",
    name: "MTech",
    branch: "Advanced Specializations",
    description: "Choose a specialization and open its 4-semester plan."
  },
  {
    id: "phd",
    name: "PhD",
    branch: "Research Domains",
    description: "Choose a research domain and explore phase-wise subjects."
  }
];

const programDefinitions = {
  btech: {
    name: "BTech",
    branchLabel: "Engineering Branch",
    branches: []
  },
  mca: {
    name: "MCA",
    branchLabel: "MCA Domain",
    branches: []
  },
  mtech: {
    name: "MTech",
    branchLabel: "MTech Specialization",
    branches: []
  },
  phd: {
    name: "PhD",
    branchLabel: "Research Domain",
    branches: []
  }
};

export const subjectCategories = [
  {
    id: "notice",
    label: "Notice",
    description: "Department updates, exam notices, and academic announcements."
  },
  {
    id: "syllabus",
    label: "Syllabus",
    description: "Official syllabus, unit structure, and marking scheme."
  },
  {
    id: "books",
    label: "Books",
    description: "Reference books, author materials, and recommended reading lists."
  },
  {
    id: "class-notes",
    label: "Class Notes",
    description: "Daily handwritten and typed notes shared by faculty and students."
  },
  {
    id: "pdf-ppt",
    label: "PDF / PPT",
    description: "Presentation decks, summary PDFs, and slide-based resources."
  },
  {
    id: "pyq",
    label: "PYQ",
    description: "Previous year question papers with solutions and answer patterns."
  },
  {
    id: "lecture",
    label: "Lecture",
    description: "Recorded and live lecture links with faculty-wise organization."
  },
  {
    id: "lab",
    label: "Lab",
    description: "Lab manuals, experiment sheets, and viva preparation material."
  },
  {
    id: "suggestion",
    label: "Suggestion",
    description: "Important topics, exam suggestions, and topper guidance."
  }
];

export function getProgramById(programId) {
  const program = programDefinitions[programId];
  return program ? { id: programId, ...program } : null;
}

export function getBranchById(program, branchId) {
  return program?.branches?.find((branch) => branch.id === branchId) || null;
}

export function getSemesterById(branch, semesterId) {
  return branch?.semesters?.find((semester) => semester.id === semesterId) || null;
}

export function getSubjectById(semester, subjectId) {
  return semester?.subjects?.find((subject) => subject.id === subjectId) || null;
}
