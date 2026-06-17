# Core Database Schema Architecture

Here is the Entity Relationship Diagram (ERD) mapping out the core database collections powering the Campus Knowledge Hub platform. This diagram visualizes how users, academic structures, and content are deeply intertwined.

```mermaid
erDiagram
    USER ||--o{ APPROVED-COURSE : "registers & manages (Rep)"
    USER ||--o{ APPROVED-COURSE : "approves (Admin)"
    USER ||--o{ RESOURCE : "uploads (Student)"
    USER ||--o{ ACADEMIC-STRUCTURE : "defines (Admin)"
    USER ||--o{ SUBJECT : "creates (Admin)"
    USER ||--o{ AUDIT-LOG : "performs actions"

    USER {
        ObjectId _id
        string fullName
        string email
        string role "student | rep | admin"
        string status "active | suspended"
        string collegeName "mapped to ApprovedCourse"
        string studentVerificationStatus
    }

    APPROVED-COURSE ||--o{ ACADEMIC-STRUCTURE : "has hierarchy"
    APPROVED-COURSE {
        ObjectId _id
        string collegeName "e.g. IIT Bombay"
        string courseName "e.g. B.Tech"
        string status "pending | approved"
        ObjectId addedByRepresentative
        ObjectId approvedByAdmin
        object profileData "Placements, CutOffs"
    }

    ACADEMIC-STRUCTURE ||--o{ SUBJECT : "contains"
    ACADEMIC-STRUCTURE {
        ObjectId _id
        string collegeName
        string programId "e.g. B.Tech"
        string branchId "e.g. CSE"
        string semesterId "e.g. SEM1"
        int semesterOrder
        ObjectId createdByAdmin
    }

    SUBJECT ||--o{ RESOURCE : "organizes"
    SUBJECT {
        ObjectId _id
        string name "e.g. Data Structures"
        string subjectId "e.g. CS201"
        string collegeName
        string programId
        string branchId
        string semesterId
        ObjectId createdByAdmin
    }

    RESOURCE ||--o{ RESOURCE-COMMENT : "has discussions"
    RESOURCE ||--o{ RATING : "receives ratings"
    RESOURCE ||--o{ RESOURCE-REPORT : "can be reported"
    RESOURCE {
        ObjectId _id
        string title
        string category "pdf | video | note"
        string url "S3 or External Link"
        boolean isApproved
        ObjectId uploadedBy
        string collegeName
        string branchId
        string semesterId
        string subjectId
    }

    NOTICE {
        ObjectId _id
        string title
        string content
        string collegeName "Target audience"
        boolean isPublished
        ObjectId author
    }

    AUDIT-LOG {
        ObjectId _id
        string action "e.g. APPROVE_COURSE"
        string entityType
        ObjectId entityId
        ObjectId actorUserId
    }
```

### Key Relationships
- **The Backbone:** `ApprovedCourse` acts as the root for a college. The `AcademicStructure` builds the specific tree under it (Programs > Branches > Semesters), and `Subject` sits precisely at the leaf of that tree.
- **Resources:** Every `Resource` is rigidly tied to a specific node in that academic tree (College -> Branch -> Semester -> Subject) so that it routes perfectly to the correct students.
- **Access Control:** `User` roles govern access to these structures. Representatives manage the `ApprovedCourse` metadata, Admins govern the `AcademicStructure` and `Subjects`, and Students supply the `Resources`.

> [!TIP]
> This represents the core data model. I omitted the auxiliary tables (Quizzes, Assignments, Payments, Plagiarism) from the diagram to keep it readable, but they map to these core entities in a similar fashion.
