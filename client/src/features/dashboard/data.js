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

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function createSemester(id, semester, subjects) {
  return {
    id,
    semester,
    subjects: subjects.map((subject) => ({
      id: slugify(subject),
      name: subject
    }))
  };
}

function createSemesters(items) {
  return items.map((item) => createSemester(item.id, item.semester, item.subjects));
}

function btechSemestersFor(branchName) {
  return createSemesters([
    {
      id: "semester-1",
      semester: "Semester 1",
      subjects: [
        "Engineering Mathematics I",
        "Engineering Physics",
        "Basic Electrical Engineering",
        "Engineering Graphics",
        "Communication Skills"
      ]
    },
    {
      id: "semester-2",
      semester: "Semester 2",
      subjects: [
        "Engineering Mathematics II",
        "Programming Fundamentals",
        "Engineering Chemistry",
        "Workshop Practice",
        "Environmental Studies"
      ]
    },
    {
      id: "semester-3",
      semester: "Semester 3",
      subjects: [
        `${branchName} Core I`,
        `${branchName} Core II`,
        "Data Structures",
        "Digital Logic Design",
        "Probability and Statistics"
      ]
    },
    {
      id: "semester-4",
      semester: "Semester 4",
      subjects: [
        `${branchName} Core III`,
        `${branchName} Core IV`,
        "Database Management Systems",
        "Operating Systems",
        "Computer Networks"
      ]
    },
    {
      id: "semester-5",
      semester: "Semester 5",
      subjects: [
        `${branchName} Core V`,
        `${branchName} Lab I`,
        "Design and Analysis of Algorithms",
        "Professional Elective I",
        "Open Elective I"
      ]
    },
    {
      id: "semester-6",
      semester: "Semester 6",
      subjects: [
        `${branchName} Core VI`,
        `${branchName} Lab II`,
        "Industrial Training",
        "Professional Elective II",
        "Open Elective II"
      ]
    },
    {
      id: "semester-7",
      semester: "Semester 7",
      subjects: [
        `${branchName} Advanced Topic`,
        "Project Phase I",
        "Professional Elective III",
        "Seminar",
        "Entrepreneurship"
      ]
    },
    {
      id: "semester-8",
      semester: "Semester 8",
      subjects: [
        "Project Phase II",
        "Internship",
        `${branchName} Design Project`,
        "Professional Elective IV",
        "Viva Voce"
      ]
    }
  ]);
}

const mcaSemesters = createSemesters([
  {
    id: "semester-1",
    semester: "Semester 1",
    subjects: [
      "Mathematical Foundations",
      "Programming with Python",
      "Database Systems",
      "Computer Organization",
      "Web Development"
    ]
  },
  {
    id: "semester-2",
    semester: "Semester 2",
    subjects: [
      "Data Structures and Algorithms",
      "Operating Systems",
      "Software Engineering",
      "Computer Networks",
      "Java Enterprise Programming"
    ]
  },
  {
    id: "semester-3",
    semester: "Semester 3",
    subjects: [
      "Cloud Computing",
      "Data Analytics",
      "Cyber Security",
      "Mobile Application Development",
      "Mini Project"
    ]
  },
  {
    id: "semester-4",
    semester: "Semester 4",
    subjects: [
      "Professional Elective",
      "Industry Internship",
      "Major Project",
      "Seminar",
      "Comprehensive Viva"
    ]
  }
]);

const mtechSemesters = createSemesters([
  {
    id: "semester-1",
    semester: "Semester 1",
    subjects: [
      "Advanced Algorithms",
      "Research Methodology",
      "Distributed Systems",
      "Advanced Database Systems",
      "Mathematical Computing"
    ]
  },
  {
    id: "semester-2",
    semester: "Semester 2",
    subjects: [
      "Machine Learning",
      "Cloud Architecture",
      "Advanced Computer Networks",
      "Information Assurance",
      "Professional Elective I"
    ]
  },
  {
    id: "semester-3",
    semester: "Semester 3",
    subjects: [
      "Deep Learning",
      "Professional Elective II",
      "Dissertation Phase I",
      "Technical Seminar",
      "Publication Review"
    ]
  },
  {
    id: "semester-4",
    semester: "Semester 4",
    subjects: [
      "Dissertation Phase II",
      "Research Publication",
      "Innovation and IPR",
      "Viva Voce",
      "Industry Problem Solving"
    ]
  }
]);

const phdPhases = createSemesters([
  {
    id: "phase-1",
    semester: "Phase 1",
    subjects: [
      "Research Methodology",
      "Literature Review",
      "Coursework I",
      "Coursework II",
      "Seminar Presentation"
    ]
  },
  {
    id: "phase-2",
    semester: "Phase 2",
    subjects: [
      "Advanced Research Seminar",
      "Publication Planning",
      "Thesis Proposal",
      "Domain Elective",
      "Progress Review I"
    ]
  },
  {
    id: "phase-3",
    semester: "Phase 3",
    subjects: [
      "Journal Paper Submission",
      "Experimental Validation",
      "Progress Review II",
      "Teaching Assistance",
      "Research Ethics"
    ]
  },
  {
    id: "phase-4",
    semester: "Phase 4",
    subjects: [
      "Pre-thesis Submission",
      "Open Seminar",
      "Thesis Writing",
      "Final Defense Preparation",
      "Viva Voce"
    ]
  }
]);

export const programCatalog = {
  btech: {
    name: "BTech",
    branchLabel: "Engineering Branch",
    branches: [
      {
        id: "cse",
        name: "Computer Science & Engineering",
        description: "Software systems, algorithms, and computing foundations.",
        semesters: btechSemestersFor("CSE")
      },
      {
        id: "it",
        name: "Information Technology",
        description: "Enterprise IT, software development, and systems management.",
        semesters: btechSemestersFor("IT")
      },
      {
        id: "ece",
        name: "Electronics & Communication",
        description: "Communication systems, electronics, and embedded design.",
        semesters: btechSemestersFor("ECE")
      },
      {
        id: "eee",
        name: "Electrical & Electronics",
        description: "Power systems, control engineering, and electrical networks.",
        semesters: btechSemestersFor("EEE")
      },
      {
        id: "me",
        name: "Mechanical Engineering",
        description: "Thermal science, machine design, and manufacturing.",
        semesters: btechSemestersFor("Mechanical")
      },
      {
        id: "ce",
        name: "Civil Engineering",
        description: "Structural analysis, surveying, and construction planning.",
        semesters: btechSemestersFor("Civil")
      }
    ]
  },
  mca: {
    name: "MCA",
    branchLabel: "MCA Domain",
    branches: [
      {
        id: "general",
        name: "General MCA",
        description: "Core application development and software engineering track.",
        semesters: mcaSemesters
      },
      {
        id: "ai-ds",
        name: "MCA (AI & Data Science)",
        description: "Application-centric AI and analytics specialization.",
        semesters: mcaSemesters
      },
      {
        id: "cyber",
        name: "MCA (Cyber Security)",
        description: "Security-focused applications and secure software systems.",
        semesters: mcaSemesters
      }
    ]
  },
  mtech: {
    name: "MTech",
    branchLabel: "MTech Specialization",
    branches: [
      {
        id: "cse",
        name: "MTech CSE",
        description: "Advanced computing and research in computer science.",
        semesters: mtechSemesters
      },
      {
        id: "ai",
        name: "MTech Artificial Intelligence",
        description: "Advanced machine learning, deep learning, and AI systems.",
        semesters: mtechSemesters
      },
      {
        id: "vlsi",
        name: "MTech VLSI Design",
        description: "Chip design, CAD tools, and semiconductor systems.",
        semesters: mtechSemesters
      }
    ]
  },
  phd: {
    name: "PhD",
    branchLabel: "Research Domain",
    branches: [
      {
        id: "computer-science",
        name: "Computer Science",
        description: "Doctoral research in systems, AI, and theoretical computing.",
        semesters: phdPhases
      },
      {
        id: "electronics",
        name: "Electronics",
        description: "Research in communication, embedded systems, and VLSI.",
        semesters: phdPhases
      },
      {
        id: "interdisciplinary",
        name: "Interdisciplinary Computing",
        description: "Cross-domain research with data, healthcare, and IoT.",
        semesters: phdPhases
      }
    ]
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
  return programCatalog[programId];
}

export function getBranchById(program, branchId) {
  return program?.branches.find((branch) => branch.id === branchId);
}

export function getSemesterById(branch, semesterId) {
  return branch?.semesters.find((semester) => semester.id === semesterId);
}

export function getSubjectById(semester, subjectId) {
  return semester?.subjects.find((subject) => subject.id === subjectId);
}
