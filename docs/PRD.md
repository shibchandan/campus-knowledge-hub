# Product Requirements Document (PRD)

## 1. Product Overview
**Campus Knowledge Hub** is a multi-tenant, SaaS-based educational networking platform designed to centralize academic resources, enable real-time student communication, and foster college-specific ecosystems. The platform bridges the gap between college administrations (representatives), students, and a global marketplace, featuring integrated AI tools, gamified learning, and a monetization engine.

## 2. Target Audience
1. **Students**: Individuals seeking college-specific academic resources (notes, assignments, quizzes), real-time peer communication, and AI assistance.
2. **College Representatives (Admins/Professors)**: Verified personnel who manage college structures (programs, branches, semesters, subjects) and broadcast official information.
3. **Super Admins**: Platform owners managing global configuration, global resources, and monetization.

## 3. Core Problems Solved
- **Fragmented Resources**: Students currently rely on scattered WhatsApp groups and Google Drives for notes.
- **Lack of Verification**: Fake information spreads easily; the platform strictly verifies college representatives to maintain academic integrity.
- **Resource Monetization**: Top-tier students and educators lack a platform to monetize high-quality notes or courses natively within a college ecosystem.

## 4. Key Features & Requirements

### 4.1. Role-Based Access Control (RBAC)
- **Super Admin**: Full platform control, approves/rejects College Representative verification requests, manages global marketplace.
- **College Representative**: Can configure Programs, Branches, Semesters, and Subjects for their specific college. Can create "Announcement Only" community groups.
- **Student**: Tied to a specific college. Can access college-specific resources, join community chat groups, take quizzes, and purchase premium marketplace items.

### 4.2. College & Academic Taxonomy
- Strict hierarchy: `College -> Program (e.g., B.Tech) -> Branch (e.g., CSE) -> Semester -> Subject`.
- Students must select their College, Program, and Branch during onboarding to receive a tailored dashboard.

### 4.3. Resource Management System
- Subject-specific resource repositories supporting categorizations: `Syllabus`, `Notes`, `Previous Year Questions (PYQs)`, `Assignments`.
- Role-based visibility: Resources can be scoped to a specific college or globally.

### 4.4. Real-Time Community Chat
- Discord/WhatsApp-style real-time chat utilizing polling or WebSockets.
- Dynamic group capacities (Free tier: 256 members).
- Join via secure 8-character Invite Codes.
- Admin controls: Transfer ownership, delete group, or restrict messaging (Broadcast Mode).
- Capacity Upgrades: Group admins can purchase extra member capacity via Razorpay integration.

### 4.5. Gamified Quizzes & Analytics
- Subject-level MCQ quizzes with real-time scoring.
- Comprehensive analytics dashboard for College Representatives to track student performance distributions.

### 4.6. AI Integration (AI Studio)
- Built-in AI assistant for summarizing text, solving equations, and explaining complex academic concepts.

### 4.7. Premium Marketplace & Monetization
- Global marketplace for premium resources, courses, and notes.
- Razorpay integration for seamless INR transactions.
- Capacity scaling micro-transactions for chat groups.

## 5. Success Metrics
- **User Engagement**: Daily Active Users (DAU) and time spent in Community Chat.
- **Resource Utility**: Number of PDF downloads and Quiz completions per semester.
- **Monetization**: Conversion rate of free groups to upgraded capacity groups, and marketplace transaction volume.
