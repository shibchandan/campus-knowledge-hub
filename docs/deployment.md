# Production Deployment & Architecture Guide

Campus Knowledge Hub is deployed across a modern, decoupled cloud architecture designed for scalability, zero-maintenance database clustering, and cost-effective media storage with zero egress fees.

---

## 🏗️ Production Architecture Overview

| Component | Platform | URL / Host | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | `https://campus-knowledge-hub-client.vercel.app` | React SPA, Edge CDN, Global SSL, Auto-Deploy on `git push` |
| **Backend API** | **Render** | `https://campus-knowledge-hub-1.onrender.com` | Node.js Express REST API, Multi-core Clustering, WAF |
| **Database** | **MongoDB Atlas** | `cluster0.mongodb.net` | Managed MongoDB Cluster, Compound Indexes, Automated Backups |
| **Media Storage** | **Cloudflare R2** | S3-Compatible Object Storage | Direct client upload via Presigned URLs, **Zero Egress Fees** |
| **Payment Gateway** | **Razorpay** | `api.razorpay.com` | Course sales & subscriptions with HMAC-SHA256 signature verification |
| **AI Studio** | **Google Gemini & OpenAI** | Multi-Provider Fallback | Retrieval-Augmented Generation (RAG) academic query assistance |
| **Uptime Monitor** | **cron-job.org** | `/ready` probe | Keeps Render backend warm via 10-minute HTTP keepalive pings |

---

## 🚀 Cloud Services Configuration

### 1. Frontend: Vercel

The client is a Vite-powered React single-page application configured with client-side routing rewrites (`client/vercel.json`).

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Root Directory:** `client`
- **Required Environment Variables:**
  ```env
  VITE_API_URL=https://campus-knowledge-hub-1.onrender.com/api
  VITE_RAZORPAY_KEY_ID=rzp_live_...
  ```

---

### 2. Backend API: Render

The backend runs as a containerized web service with automated GitHub deployment.

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Root Directory:** `server`
- **Health & Readiness Endpoints:**
  - `GET /health` — Lightweight ping endpoint for keep-alive monitoring
  - `GET /ready` — Comprehensive deployment readiness probe:
    ```json
    {
      "success": true,
      "message": "Campus Knowledge Hub API is ready",
      "data": {
        "ok": true,
        "sharedStorageConfigured": true,
        "databaseStatus": "connected",
        "issues": [],
        "warnings": []
      }
    }
    ```

#### Backend Environment Variables Checklist:
```env
# Application & Networking
NODE_ENV=production
PORT=5000
CLIENT_URL=https://campus-knowledge-hub-client.vercel.app
TRUST_PROXY=1
ENFORCE_HTTPS=true

# Database (MongoDB Atlas)
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/campus-knowledge-hub?retryWrites=true&w=majority

# Authentication & JWT
JWT_SECRET=your_jwt_secret_key
REFRESH_TOKEN_SECRET=your_refresh_token_secret_key
AUTH_COOKIE_NAME=campus_auth_token

# Cloudflare R2 (Media & Document Storage)
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_key
CLOUDFLARE_R2_BUCKET_NAME=campus-knowledge-hub-resources
CLOUDFLARE_R2_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_R2_PUBLIC_URL=https://your-r2-public-domain.com

# Razorpay Payments
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your_razorpay_secret

# AI Providers
AI_PROVIDER=gemini
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
# Optional OpenAI fallback
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

---

## 🔒 Security Architecture (17 Layers)

1. **WAF & Abuse Protection (`abuseProtection.js`):** Blocks NoSQL injection (`$where`, `$expr`), SSRF, path traversal, command injection, and scanner probes.
2. **LLM Prompt Injection Firewall (`llmFirewall.js`):** Regex guards against jailbreaks, system-prompt extraction, and token smuggling.
3. **HTTP Security Headers (`securityHeaders.js`):** Enforces HSTS (preload), CSP with per-request nonces, COOP (`same-origin`), COEP (`require-corp`), and X-Frame-Options (`DENY`).
4. **Rate Limiting (`rateLimit.js`):** Distributed rate limiter with MongoDB TTL buckets and Redis support.
5. **Request Body Size Guard (`requestSizeGuard.js`):** Route-specific payload caps (16 KB for auth endpoints) mitigating buffer DoS attacks.
6. **Token Blacklisting & Rotation:** Revokes JWT tokens immediately upon logout or privilege modification.
7. **Role-Based Access Control (RBAC):** Middleware-level permission enforcement across `student`, `representative`, and `admin` scopes.
8. **Webhook Cryptographic Verification:** All Razorpay payments verified via HMAC-SHA256 signature calculations.

---

## 🛠️ Local Development & Testing

### 1. Run Backend Server:
```powershell
cd server
npm install
npm run dev
```

### 2. Run Frontend Client:
```powershell
cd client
npm install
npm run dev
```

### 3. Run Automated Tests:
```powershell
npm run test:server
```

---

## 📊 Monitoring & Maintenance

1. **Cold Start Keepalive:** Set up an external cron job on [cron-job.org](https://cron-job.org) targeting `https://campus-knowledge-hub-1.onrender.com/ready` every **10 minutes** to keep the Render free-tier container active.
2. **Database Snapshots:** Configured through MongoDB Atlas Daily Automated Backups.
3. **Core Web Vitals:** Telemetry actively monitored through `@vercel/speed-insights/react`.
