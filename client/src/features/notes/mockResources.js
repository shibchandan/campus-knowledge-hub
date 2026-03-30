export const mockResources = [
  {
    title: "CN Unit 3 Topper Notes",
    type: "Notes",
    course: "Computer Networks",
    semester: "Semester 5",
    professor: "Prof. Mehta",
    version: "v3",
    coverage: "Unit 3, Unit 4",
    format: "PDF + handwritten summary",
    quizFocus: ["short notes", "protocol comparison", "numericals"]
  },
  {
    title: "DBMS PYQ Solutions 2025",
    type: "PYQ",
    course: "DBMS",
    semester: "Semester 4",
    professor: "Prof. Shah",
    version: "v1",
    coverage: "Normalization, SQL, Transactions",
    format: "Solved PYQ booklet",
    quizFocus: ["2-mark concepts", "SQL queries", "normal forms"]
  },
  {
    title: "Operating Systems Revision Book",
    type: "Book",
    course: "Operating Systems",
    semester: "Semester 4",
    professor: "Prof. Iyer",
    version: "v2",
    coverage: "Scheduling, memory, deadlocks",
    format: "Reference PDF",
    quizFocus: ["definitions", "algorithms", "case questions"]
  }
];

export const quizArrangements = [
  {
    id: "pyq-sprint",
    title: "PYQ Sprint Quiz",
    duration: "20 min",
    difficulty: "Medium",
    mode: "Previous year pattern",
    note: "Quick mixed quiz from repeated PYQ themes.",
    resourceMatch: "DBMS PYQ Solutions 2025",
    questions: [
      {
        prompt: "Which normal form removes partial dependency?",
        options: ["1NF", "2NF", "BCNF", "4NF"],
        answer: "2NF"
      },
      {
        prompt: "Which SQL clause is used to filter grouped records?",
        options: ["WHERE", "ORDER BY", "HAVING", "DISTINCT"],
        answer: "HAVING"
      },
      {
        prompt: "A DBMS transaction must satisfy which property set?",
        options: ["CAP", "ACID", "REST", "CRUD"],
        answer: "ACID"
      }
    ]
  },
  {
    id: "topper-recall",
    title: "Topper Notes Recall Test",
    duration: "12 min",
    difficulty: "Easy",
    mode: "Memory revision",
    note: "Tests exact points from class notes and topper summaries.",
    resourceMatch: "CN Unit 3 Topper Notes",
    questions: [
      {
        prompt: "Which layer is responsible for end-to-end communication in CN?",
        options: ["Network Layer", "Transport Layer", "Session Layer", "Physical Layer"],
        answer: "Transport Layer"
      },
      {
        prompt: "TCP is best described as:",
        options: [
          "Connectionless and unreliable",
          "Connection-oriented and reliable",
          "Only used for routing",
          "A physical medium"
        ],
        answer: "Connection-oriented and reliable"
      },
      {
        prompt: "UDP is preferred when the application needs:",
        options: [
          "Strict delivery guarantee",
          "High protocol overhead",
          "Low latency and speed",
          "Disk storage"
        ],
        answer: "Low latency and speed"
      }
    ]
  },
  {
    id: "exam-pressure",
    title: "Exam Pressure Drill",
    duration: "35 min",
    difficulty: "Hard",
    mode: "Timed subjective + MCQ mix",
    note: "Best for final revision before university exams.",
    resourceMatch: "Operating Systems Revision Book",
    questions: [
      {
        prompt: "Which scheduling algorithm can cause starvation for long jobs?",
        options: ["FCFS", "Round Robin", "SJF", "FIFO"],
        answer: "SJF"
      },
      {
        prompt: "Deadlock requires which set of conditions?",
        options: [
          "Paging and segmentation",
          "Mutual exclusion, hold and wait, no preemption, circular wait",
          "Compilation and linking",
          "Only mutual exclusion"
        ],
        answer: "Mutual exclusion, hold and wait, no preemption, circular wait"
      },
      {
        prompt: "Which memory allocation issue creates unusable scattered free space?",
        options: ["Thrashing", "Fragmentation", "Paging", "Swapping"],
        answer: "Fragmentation"
      }
    ]
  }
];

export const notesOverviewStats = [
  {
    label: "Tracked Resources",
    value: "126",
    caption: "Notes, books, and solved PYQ collections"
  },
  {
    label: "Quiz Sets",
    value: "18",
    caption: "Arranged from notes and PYQ patterns"
  },
  {
    label: "Revision Ready",
    value: "8 Units",
    caption: "Prepared for quick practice flow"
  }
];

export function getQuizArrangementById(quizId) {
  return quizArrangements.find((item) => item.id === quizId);
}
