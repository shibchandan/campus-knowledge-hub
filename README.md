# Campus Knowledge Hub

Campus Knowledge Hub is an AI-enabled academic platform for college communities.  
It combines role-based governance, course content management, AI support, and collaboration in one system.

## Quick Links

- Full project wiki: [WIKI.md](./WIKI.md)
- Deployment notes: [docs/deployment.md](./docs/deployment.md)
- Architecture notes: [docs/architecture.md](./docs/architecture.md)
- Secret rotation policy: [docs/secrets-policy.md](./docs/secrets-policy.md)
- WAF and abuse protection: [docs/waf-abuse-protection.md](./docs/waf-abuse-protection.md)

## Monorepo Structure

- `client` - React + Vite frontend
- `server` - Node.js + Express backend
- `docs` - architecture and deployment documentation

## Run Locally

1. Go to your Documents folder

```powershell
cd %USERPROFILE%\Documents
```

2. Open project folder

```powershell
cd "New project"
```

3. Start backend

```powershell
cd "C:\Users\shib chandan mistry\Documents\New project\server"
node src/server.js
```

4. Start frontend in a new terminal

```powershell
cd "C:\Users\shib chandan mistry\Documents\New project\client"
npm run dev
```

5. Open frontend at `http://localhost:5173`

## Core Modules

- Authentication + role access (`admin`, `representative`, `student`)
- College governance and approval workflows
- Academic structure management (program/branch/semester/subject)
- Category-based resources (notes, lecture, lab, PYQ, syllabus, etc.)
- AI assistant with provider integration and history
- Notices, moderation, audit logs, and admin controls

For detailed explanation of features, data flow, APIs, security, and deployment, see [WIKI.md](./WIKI.md).
Security role mapping is documented in `WIKI.md` section `7.1 Security Control Mapping (Used For Whom)`.
