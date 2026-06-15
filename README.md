# 🎓 Campus Knowledge Hub

An AI-enabled, secure collegiate academic resource sharing & governance platform. 

Campus Knowledge Hub is designed for college communities to collaborate, manage study materials, organize courses, and request academic approvals. It features a complete role-based governance model, responsive interfaces, micro-animations, input validation, custom rate-limiting, and an AI-powered assistant grounded in collegiate scopes.

> ⚠️ **Notice to Recruiters & Visitors:** This repository is made public strictly for portfolio evaluation and campus placement purposes. This is a proprietary, closed-source application. Unauthorized copying, hosting, or commercial usage of this code is strictly prohibited and legally protected.

---

## 🔗 Live Application Links

* **Live Demo (Client):** [campus-knowledge-hub-client.vercel.app](https://campus-knowledge-hub-client.vercel.app)
* **Backend API (Server):** [campus-knowledge-hub-1.onrender.com](https://campus-knowledge-hub-1.onrender.com)

---

## 🏗️ Project Structure

This project is structured as a monorepo containing:
* **`client/`**: React + Vite frontend styled with responsive CSS tokens, featuring light/dark mode and a secure password visibility toggle.
* **`server/`**: Node.js + Express backend, powered by MongoDB (Mongoose) with transactional integrity.
* **`docs/`**: Detailed project documentation including WAF configurations, secret policy, and architecture design maps.

### Architecture Diagram

```mermaid
graph TD
    subgraph Client Layer
        UI[React Dashboard UI]
        AuthCtx[Auth & College Context]
        UI --> AuthCtx
    end

    subgraph Server Layer Node.js / Express
        WAF[WAF & Rate Limiter]
        Auth[JWT Middleware]
        API[Express API Routes]
        AI[AI Studio Controller]
        
        WAF --> Auth
        Auth --> API
        Auth --> AI
    end

    subgraph Data & External Services
        DB[(MongoDB Database)]
        SMTP[SMTP Service]
        LLM[External AI Providers]
    end

    AuthCtx -->|REST API Calls| WAF
    API -->|Mongoose ODM| DB
    API -->|Emails / OTP| SMTP
    AI -->|Prompt Execution| LLM
    AI -->|Audit Logs| DB
```

---

## 🚀 Core Features

### 🔐 1. Advanced Security & Access Control
* **Role-Based Access Control (RBAC):** Distinct permission tiers for **Students**, **College Representatives**, and **Administrators**.
* **Password Visibility Toggle:** Premium user experience with eye-icons and SVGs built into Login, Register, and Password Reset screens.
* **Abuse & WAF protection:** Custom Web Application Firewall middleware that blocks directory traversal (`../`), scripting attacks (`<script>`), SQL injections (`UNION SELECT`), and unauthorized CLI tools.
* **Rate Limiting:** Shared Mongo-based or local memory-based rate limiters to prevent authentication brute-force and DDoS attempts.

### 📚 2. Academic Resource & notice Hub
* **Syllabus & Material Governance:** Organizes content logically by College ➔ Program ➔ Branch ➔ Semester ➔ Subject.
* **Asset Moderation:** Secure upload for PDF/PPTs, notes, books, PYQs (Previous Year Questions), and lecture links.
* **Notice Workflow:** Representative announcements targeted globally or restricted to specific college scopes.

### 🤖 3. AI Academic Studio
* **Multi-Provider AI Integration:** Supports OpenAI (GPT-4o-mini), Google Gemini (Gemini 1.5 Flash), and Anthropic (Claude 3.5 Sonnet) chat engines.
* **Academic Grounding:** Scopes queries strictly to college subjects and course descriptions to prevent hallucinations.
* **Chat Memory:** Persists thread contexts across sessions with responsive UI animations.

### ⚙️ 4. Enterprise Audit Trails
* **Security Logs:** Fully-audited actions for user creation, college approvals, notice publishing, and document deletions.



## 📝 Documentations

For detailed descriptions of database models, transaction consistency, and user privilege tables, please refer to:
* **[WIKI.md](./WIKI.md)**: Main developer and security control document.
* **[docs/architecture.md](./docs/architecture.md)**: Details regarding routing, validation, and data persistence models.
