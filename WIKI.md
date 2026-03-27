# Campus Knowledge Hub - Project Wiki

## 1. Project Summary

Campus Knowledge Hub is a role-based academic platform designed for college-level learning ecosystems.
It supports:

- professor/representative-managed academic content
- admin-governed college/course approval
- student-facing discovery and study workflows
- AI-assisted answers and study support using college content

The platform is built as a full-stack monorepo with a React frontend and Node.js/Express backend over MongoDB.

---

## 2. Problem Statement

Most students manage lectures, notes, PYQs, notices, and discussions across disconnected tools.
This causes:

- poor discoverability of trusted materials
- duplication and low quality content
- weak moderation and plagiarism visibility
- no structured college-specific AI guidance

Campus Knowledge Hub solves this by centralizing verified academic content and enforcing governance.

---

## 3. Major Functional Modules

## 3.1 Role-Based Access

Roles:

- `admin`: platform governance and moderation
- `representative`: submits and manages approved college-specific academic data
- `student`: consumes approved content and resources

Security model:

- JWT-based authentication
- role authorization middleware
- account status controls (`active`, `suspended`, `banned`)

---

## 3.2 College Governance

Representative submits college-course requests.
Admin approves/rejects requests.
Duplicate protections prevent conflicting same college-course submissions across representatives.

Also includes:

- approved course management
- college profile management (exams, rankings, cut-off, placement details)

---

## 3.3 Academic Structure Management

Academic hierarchy is database-driven:

- program
- branch/domain
- semester
- subject

This supports college-wise differences in subject lists.
If no DB records exist, frontend can fall back to starter data.

---

## 3.4 Resource Management (Subject Category Level)

Flow:

`Department -> Branch -> Semester -> Subject -> Category -> Resources`

Category examples:

- notice
- syllabus
- books
- class notes
- pdf/ppt
- lecture
- lab
- pyq
- suggestion

Resource capabilities:

- upload
- metadata edit
- delete
- file preview
- download
- upvote/downvote
- 1-5 star rating
- comments (including lecture video comments)
- pagination/search

Lecture category policy:

- video upload only

---

## 3.5 AI Learning Engine

AI module supports:

- provider status check
- user question answering
- context-aware answer generation using available campus resources
- per-student AI history

Supported providers (via env):

- OpenAI
- Gemini
- Anthropic

If provider config is missing or unavailable:

- structured fallback response is returned to keep UX stable

---

## 3.6 Admin Super Control

Admin panel provides:

- request approval/rejection
- user creation and role updates
- suspend/ban/activate controls
- notice publishing/moderation
- resource moderation
- audit log visibility
- admin metrics cards for operational visibility

Search/filter/sort is included across major list-heavy sections.

---

## 3.6.1 Marketplace Course Buy/Sell

- All roles (`student`, `representative`, `admin`) can list courses.
- Course listing supports free and paid models.
- `price = 0` is auto-tagged as `free-course`.
- `price > 0` is auto-tagged as `paid-course`.
- Paid courses include automatic platform fee and GST in checkout pricing.
- Price breakdown is transparent: base price + platform fee + GST + total.
- Students can enroll in free courses and buy paid courses.
- Sellers can edit/archive their own course listings.
- Admin can moderate/archive any listing.
- Purchase history is available per user.

---

## 3.7 Profile and Security UX

Account settings include:

- profile update
- avatar URL support (optional)
- change password flow
- password visibility toggles
- password strength hints
- account snapshot cards

Forgot password:

- OTP-based reset with rate limits, cooldowns, and lockout protections

---

## 4. Technology Stack

Frontend:

- React (Vite SPA)
- React Router
- CSS-based responsive theme system with light/dark mode

Backend:

- Node.js
- Express
- Mongoose (MongoDB ODM)

Database:

- MongoDB (local or Atlas)

Storage:

- local file storage fallback
- optional Cloudflare R2 integration for media

AI/ML Integration:

- API-based model provider integration
- structured prompt and response pipeline

---

## 5. Backend Architecture

Typical module structure:

- `model`
- `validation`
- `controller`
- `routes`

Cross-cutting middleware/services:

- auth middleware
- request sanitization
- rate limiting
- upload handling
- audit logging service
- app/request logging service

---

## 6. Data and Collections (Conceptual)

Key collections include:

- users
- college requests
- approved college-course records
- college profiles
- academic structures
- subjects
- resources
- notices
- AI history
- audit logs

Indexing strategy is applied on high-frequency lookup fields like:

- role/status
- college+course uniqueness
- subject hierarchy filters
- resource listing filters

---

## 7. Security Methods Implemented

- JWT auth and protected routes
- JWT secret rotation support (current + previous verification secrets)
- role authorization checks
- account status enforcement
- input validation + sanitization
- auth and AI rate limiting
- abuse-protection middleware for suspicious paths/payloads
- OTP controls:
  - expiry
  - cooldown
  - retry limits
  - lockout
- upload restrictions:
  - MIME/extension checks
  - category-specific policy
  - size limits
- audit trails for sensitive operations
- vault/file-based secret loading via `*_FILE` environment variables
- infra-level WAF runbook in `docs/waf-abuse-protection.md`

---

## 7.1 Security Control Mapping (Used For Whom)

1. JWT auth + protected routes  
Used for: `admin`, `representative`, `student`  
Purpose: Prevents unauthenticated access to private APIs.

2. Role authorization checks  
Used for: `admin`, `representative`, `student`  
Purpose: Ensures each role can access only allowed actions.

3. Account status enforcement (`active/suspended/banned`)  
Used for: platform + all users  
Purpose: Stops suspended/banned abuse accounts from operating.

4. OTP reset with cooldown/lockout  
Used for: all users  
Purpose: Protects password reset flow from brute-force takeover.

5. Change password (logged-in flow)  
Used for: all users  
Purpose: Allows safe credential refresh after suspected compromise.

6. Auth route rate limiting  
Used for: all users + platform  
Purpose: Reduces brute-force login and OTP abuse.

7. AI route rate limiting  
Used for: platform + students  
Purpose: Prevents bot spam/cost abuse on AI endpoints.

8. Input validation + sanitization  
Used for: all users  
Purpose: Blocks malformed/injection-style request payloads.

9. Upload restrictions (type/size/category)  
Used for: all users + platform  
Purpose: Reduces malicious file upload risk.

10. Malware scanning pipeline (when enabled)  
Used for: all users + platform  
Purpose: Adds file-level threat detection before serving content.

11. Abuse-protection middleware  
Used for: platform + all users  
Purpose: Blocks suspicious scanner/probing traffic patterns.

12. HTTPS enforcement + secure cookies (production)  
Used for: all users  
Purpose: Protects tokens/sessions in transit from interception.

13. JWT secret rotation + previous-key verification  
Used for: all users + platform  
Purpose: Enables secure key rotation without breaking active sessions.

14. Vault/file-managed secrets (`*_FILE`)  
Used for: platform operators  
Purpose: Avoids hardcoding secrets in repo/process args.

15. Audit logs for sensitive operations  
Used for: platform operators + compliance  
Purpose: Provides traceability for admin/security-critical actions.

16. Infra WAF (Cloudflare/AWS)  
Used for: platform + all users  
Purpose: Stops abusive traffic at edge before app is hit.

---

## 8. UI/UX Implementation Notes

Completed polish areas:

- improved settings page UX
- admin dashboard metrics
- search/filter/sort on major pages
- responsive layout cleanup
- dark mode improvements

Main UX principles followed:

- role clarity
- predictable card/list patterns
- mobile-friendly controls
- category-first learning navigation

---

## 9. API Surface (High-Level)

Main route groups:

- `/api/auth/*`
- `/api/governance/*`
- `/api/academic/*`
- `/api/resources/*`
- `/api/notices/*`
- `/api/ai/*`
- `/api/audit/*`

Health/root checks:

- `/`
- `/health`

---

## 10. Environment Configuration

Backend env essentials:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_SECRET_FILE` (vault/file-managed alternative)
- `JWT_PREVIOUS_SECRETS` / `JWT_PREVIOUS_SECRETS_FILE` (for safe rotation)
- `JWT_EXPIRES_IN`
- `CLIENT_URL`

Optional SMTP (email OTP delivery):

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_PASS_FILE`
- `SMTP_FROM`

Optional AI providers:

- `AI_PROVIDER`
- `OPENAI_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY_FILE` / `GEMINI_API_KEY_FILE` / `ANTHROPIC_API_KEY_FILE`
- provider model variable

Optional Cloudflare R2:

- `R2_ENDPOINT`
- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_SECRET_ACCESS_KEY_FILE`
- `R2_PUBLIC_BASE_URL`
- `R2_FOLDER`

Secret governance and rotation runbook:

- `docs/secrets-policy.md`

---

## 11. Local Development Runbook

1. Open terminal and go to Documents:

```powershell
cd %USERPROFILE%\Documents
```

2. Enter project folder:

```powershell
cd "New project"
```

3. Configure backend `.env`
4. Start MongoDB (local recommended during development)
5. Start backend:

```powershell
cd "C:\Users\shib chandan mistry\Documents\New project\server"
node src/server.js
```

6. Start frontend in a new terminal:

```powershell
cd "C:\Users\shib chandan mistry\Documents\New project\client"
npm run dev
```

7. Open: `http://localhost:5173`

---

## 12. Testing, Deployment, and Operations

Current readiness includes:

- backend test scaffolding
- Dockerfiles (`client`, `server`)
- `docker-compose.yml`
- deployment notes in `docs/deployment.md`
- app/request logging
- audit logs

Recommended production extensions:

- CI pipeline
- fuller integration/e2e coverage
- external monitoring stack
- backup and restore automation

---

## 13. Known Constraints and Next Enhancements

Potential next upgrades:

- embeddings-based semantic retrieval for AI
- richer analytics dashboard for admin
- stronger document processing pipeline
- cloud-first media serving and signed URL strategy
- stricter moderation workflows with approval queues

---

## 14. Project Value

This project is suitable for:

- final-year university evaluation
- hackathon showcase
- research-oriented demonstration
- early-stage EdTech prototype validation

It demonstrates practical integration of:

- governance + moderation
- academic content management
- role-aware UX
- AI-assisted workflows
- security-aware backend design
